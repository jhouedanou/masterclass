import { supabase } from './client'
import { traduireErreur, verifier, verifierUn } from './erreurs'
import { basculerFormatVideo } from './mediatheque'
import type { TravailVideoRow } from './types'

/**
 * File d'encodage.
 *
 * Un dépôt depuis l'administration produit un MP4 unique, lisible tout de
 * suite. Le multi-débit demande ffmpeg, que rien dans la chaîne applicative ne
 * sait exécuter : un exécutant externe vient tirer les travaux d'ici, transcode
 * et repose le résultat dans le même dossier de stockage.
 *
 * Le chapitre reste lisible pendant toute l'opération. C'est ce qui rend le
 * chantier vivable : un encodage qui échoue ne casse rien, il laisse
 * simplement la vidéo dans sa forme d'origine.
 */

export interface TravailEncodage {
  id: string
  videoId: string
  cle: string
  statut: TravailVideoRow['statut']
  tentatives: number
  paliers: string[] | null
  dureeSecondes: number | null
  octets: number | null
  erreur: string | null
  prisLe: string | null
  creeLe: string
}

function versTravail(ligne: TravailVideoRow): TravailEncodage {
  return {
    id: ligne.id,
    videoId: ligne.video_id,
    cle: ligne.cle,
    statut: ligne.statut,
    tentatives: ligne.tentatives,
    paliers: ligne.paliers,
    dureeSecondes: ligne.duree_secondes,
    octets: ligne.octets === null ? null : Number(ligne.octets),
    erreur: ligne.erreur,
    prisLe: ligne.pris_le,
    creeLe: ligne.cree_le,
  }
}

/**
 * Met une vidéo en file.
 *
 * Silencieux si un travail vivant existe déjà pour elle : l'index unique
 * partiel le refuse, et ce refus n'est pas une erreur — deux dépôts successifs
 * sur le même chapitre sont un geste ordinaire de l'équipe, pas un incident à
 * remonter jusqu'à l'écran.
 */
export async function mettreEnFile(videoId: string, cle: string): Promise<TravailEncodage | null> {
  const { data, error } = await supabase()
    .from('travaux_video')
    .insert({ video_id: videoId, cle } as never)
    .select('*')
    .maybeSingle()

  // 23505 : violation d'unicité — un travail vivant existe déjà.
  if (error?.code === '23505') return null
  if (error) throw traduireErreur(error, 'mise en file d’encodage')
  return data ? versTravail(data as TravailVideoRow) : null
}

/**
 * Saisit un travail pour l'exécutant appelant.
 *
 * Passe par la fonction de base, et non par un `select` suivi d'un `update` :
 * seuls `for update skip locked` et la transaction implicite d'une fonction
 * garantissent que deux exécutants concurrents repartent avec deux travaux
 * distincts.
 */
export async function prendreTravail(options?: {
  minutesAbandon?: number
  tentativesMax?: number
}): Promise<{ id: string; videoId: string; cle: string; tentatives: number } | null> {
  const { data, error } = await supabase().rpc('prendre_travail_video', {
    p_minutes_abandon: options?.minutesAbandon ?? 60,
    p_tentatives_max: options?.tentativesMax ?? 3,
  })
  if (error) throw traduireErreur(error, 'prise d’un travail d’encodage')

  const ligne = (data ?? [])[0]
  return ligne
    ? { id: ligne.id, videoId: ligne.video_id, cle: ligne.cle, tentatives: ligne.tentatives }
    : null
}

/**
 * Clôt un travail réussi : le flux existe, la vidéo change de forme.
 *
 * L'ordre est celui-ci et pas l'autre. Le report du format vient en premier,
 * parce que c'est lui qui fait réellement passer les apprenants au multi-débit ;
 * marquer le travail terminé avant lui laisserait, en cas d'échec de la
 * bascule, une file propre au-dessus d'un catalogue resté en mono-débit, sans
 * que rien ne rappelle le travail à refaire.
 */
export async function reussirTravail(
  id: string,
  resultat: { paliers: string[]; dureeSecondes: number | null; octets: number | null },
): Promise<{ chapitresReportes: number }> {
  const travail = verifierUn(
    await supabase().from('travaux_video').select('*').eq('id', id).maybeSingle(),
    'travail d’encodage',
    'Travail introuvable',
  ) as TravailVideoRow

  const report = await basculerFormatVideo(travail.video_id, 'hls')

  verifier(
    await supabase()
      .from('travaux_video')
      .update({
        statut: 'termine',
        paliers: resultat.paliers,
        duree_secondes: resultat.dureeSecondes,
        octets: resultat.octets,
        erreur: null,
        pris_le: null,
      } as never)
      .eq('id', id)
      .select('id'),
    'clôture du travail d’encodage',
  )

  return report
}

/**
 * Consigne un échec.
 *
 * Le travail retourne à la file tant qu'il lui reste des tentatives : une
 * coupure réseau au milieu d'un téléversement de segments n'est pas une raison
 * d'abandonner un fichier. Passé le plafond, il s'arrête là et se voit dans
 * l'administration — la file doit pouvoir se vider.
 */
export async function echouerTravail(
  id: string,
  motif: string,
  tentativesMax = 3,
): Promise<TravailEncodage> {
  const travail = verifierUn(
    await supabase().from('travaux_video').select('*').eq('id', id).maybeSingle(),
    'travail d’encodage',
    'Travail introuvable',
  ) as TravailVideoRow

  const definitif = travail.tentatives >= tentativesMax

  const maj = verifierUn(
    await supabase()
      .from('travaux_video')
      .update({
        statut: definitif ? 'echec' : 'en-file',
        erreur: motif.slice(0, 2000),
        pris_le: null,
      } as never)
      .eq('id', id)
      .select('*')
      .maybeSingle(),
    'échec du travail d’encodage',
    'Travail introuvable',
  ) as TravailVideoRow

  return versTravail(maj)
}

/** Travaux d'une liste de vidéos, pour l'affichage de l'administration. */
export async function travauxDesVideos(videoIds: string[]): Promise<Map<string, TravailEncodage>> {
  if (!videoIds.length) return new Map()

  const lignes = verifier(
    await supabase()
      .from('travaux_video')
      .select('*')
      .in('video_id', videoIds)
      .order('cree_le', { ascending: false }),
    'travaux d’encodage',
  ) as TravailVideoRow[]

  // Le plus récent fait foi : un remplacement de vidéo laisse derrière lui les
  // travaux de la version précédente.
  const parVideo = new Map<string, TravailEncodage>()
  for (const ligne of lignes) {
    if (!parVideo.has(ligne.video_id)) parVideo.set(ligne.video_id, versTravail(ligne))
  }
  return parVideo
}
