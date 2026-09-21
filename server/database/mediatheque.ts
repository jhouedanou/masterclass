import { supabase } from './client'
import { traduireErreur, verifier, verifierOptionnel, verifierUn } from './erreurs'
import type { VideoRow } from './types'

/**
 * Médiathèque vidéo.
 *
 * Une entrée désigne un objet déposé dans le stockage ; plusieurs chapitres
 * peuvent la servir. Le décompte des usages accompagne chaque lecture, parce
 * que c'est lui qui décide de tout ici : ce qui est utilisé ne s'efface pas, et
 * ce qui ne l'est plus doit se voir pour ne pas rester facturé des années.
 *
 * La clé de stockage, elle, ne bouge jamais. Renommer un objet dans un stockage
 * d'objets n'existe pas : il faut le recopier puis effacer l'original — sept
 * cents mégaoctets pour changer un libellé. D'où un titre en base, distinct du
 * chemin, qui se renomme pour rien.
 */

export interface VideoMediatheque {
  id: string
  cle: string
  nom: string
  nomFichier: string
  tailleOctets: number | null
  dureeSecondes: number | null
  format: 'hls' | 'fichier'
  deposeLe: string
  /** Chapitres qui servent cette vidéo, module compris — c'est ce qui rend un
   *  refus d'effacement compréhensible plutôt qu'arbitraire. */
  usages: { chapitreId: string; libelle: string; moduleId: string; moduleTitre: string }[]
}

type LigneUsage = {
  id: string
  libelle: string
  module_id: string
  video_id: string
  modules: { titre: string } | { titre: string }[] | null
}

function versVideo(ligne: VideoRow, usages: VideoMediatheque['usages']): VideoMediatheque {
  return {
    id: ligne.id,
    cle: ligne.cle,
    nom: ligne.nom,
    nomFichier: ligne.nom_fichier,
    tailleOctets: ligne.taille_octets === null ? null : Number(ligne.taille_octets),
    dureeSecondes: ligne.duree_secondes,
    format: ligne.format,
    deposeLe: ligne.depose_le,
    usages,
  }
}

/**
 * La médiathèque entière, chaque entrée sachant qui s'en sert.
 *
 * Deux requêtes plutôt qu'une jointure imbriquée : le fonds se compte en
 * dizaines d'entrées, et rassembler ici évite une réponse en arbre que le
 * client devrait reconstruire de toute façon.
 */
export async function listerMediatheque(): Promise<VideoMediatheque[]> {
  const videos = verifier(
    await supabase().from('videos').select('*').order('depose_le', { ascending: false }),
    'médiathèque',
  ) as VideoRow[]

  if (!videos.length) return []

  const chapitres = verifier(
    await supabase()
      .from('chapitres')
      .select('id, libelle, module_id, video_id, modules(titre)')
      .not('video_id', 'is', null),
    'usages des vidéos',
  ) as unknown as LigneUsage[]

  const parVideo = new Map<string, VideoMediatheque['usages']>()
  for (const chapitre of chapitres) {
    const module = Array.isArray(chapitre.modules) ? chapitre.modules[0] : chapitre.modules
    const liste = parVideo.get(chapitre.video_id) ?? []
    liste.push({
      chapitreId: chapitre.id,
      libelle: chapitre.libelle,
      moduleId: chapitre.module_id,
      moduleTitre: module?.titre ?? '',
    })
    parVideo.set(chapitre.video_id, liste)
  }

  return videos.map((v) => versVideo(v, parVideo.get(v.id) ?? []))
}

export async function trouverVideo(id: string): Promise<VideoMediatheque | null> {
  const ligne = verifierOptionnel(
    await supabase().from('videos').select('*').eq('id', id).maybeSingle(),
    'vidéo',
  ) as VideoRow | null
  if (!ligne) return null

  const chapitres = verifier(
    await supabase()
      .from('chapitres')
      .select('id, libelle, module_id, video_id, modules(titre)')
      .eq('video_id', id),
    'usages de la vidéo',
  ) as unknown as LigneUsage[]

  return versVideo(
    ligne,
    chapitres.map((c) => {
      const module = Array.isArray(c.modules) ? c.modules[0] : c.modules
      return {
        chapitreId: c.id,
        libelle: c.libelle,
        moduleId: c.module_id,
        moduleTitre: module?.titre ?? '',
      }
    }),
  )
}

/**
 * Entrée de médiathèque née d'un dépôt.
 *
 * La clé porte l'unicité : un dépôt finalisé deux fois — reprise après une
 * coupure au mauvais moment — ne doit pas produire deux entrées pour un seul
 * objet, dont l'une s'effacerait en emportant l'autre.
 */
export async function inscrireVideo(champs: {
  cle: string
  nom: string
  nomFichier: string
  tailleOctets: number | null
  dureeSecondes: number | null
  deposePar: string
}): Promise<VideoRow> {
  const { data, error } = await supabase()
    .from('videos')
    .upsert(
      {
        cle: champs.cle,
        nom: champs.nom.trim().slice(0, 200),
        nom_fichier: champs.nomFichier,
        taille_octets: champs.tailleOctets,
        duree_secondes: champs.dureeSecondes,
        format: 'fichier',
        depose_par: champs.deposePar,
      } as never,
      { onConflict: 'cle' },
    )
    .select('*')
    .single()

  if (error) throw traduireErreur(error, 'inscription de la vidéo')
  return data as VideoRow
}

export async function renommerVideo(id: string, nom: string): Promise<void> {
  verifierUn(
    await supabase()
      .from('videos')
      .update({ nom: nom.trim().slice(0, 200) } as never)
      .eq('id', id)
      .select('id')
      .maybeSingle(),
    'renommage de la vidéo',
    'Vidéo introuvable',
  )
}

export async function effacerVideo(id: string): Promise<void> {
  verifier(await supabase().from('videos').delete().eq('id', id).select('id'), 'effacement de la vidéo')
}
