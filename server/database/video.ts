import { supabase } from './client'
import { traduireErreur, verifier, verifierOptionnel, verifierUn } from './erreurs'

/**
 * Téléversements de vidéos en cours.
 *
 * Le fichier ne traverse jamais l'application : il part du navigateur vers le
 * stockage d'objets, par parts. Ce qui transite ici, ce sont les étiquettes
 * que chaque part renvoie et dont la finalisation a besoin — et que le
 * stockage, vu d'un Worker, ne sait pas relister. Perdues, elles condamnent un
 * dépôt de sept cents mégaoctets à tout recommencer.
 */

export interface TeleversementVideo {
  id: string
  chapitreId: string
  cle: string
  uploadId: string
  nomFichier: string
  tailleOctets: number
  taillePartOctets: number
  nbParts: number
  dureeSecondes: number | null
  parts: { n: number; etag: string }[]
  statut: 'en-cours' | 'termine' | 'abandonne'
  creeLe: string
}

type LigneTeleversement = {
  id: string
  chapitre_id: string
  cle: string
  upload_id: string
  nom_fichier: string
  taille_octets: number
  taille_part_octets: number
  nb_parts: number
  duree_secondes: number | null
  parts: { n: number; etag: string }[]
  statut: 'en-cours' | 'termine' | 'abandonne'
  cree_le: string
}

function versTeleversement(ligne: LigneTeleversement): TeleversementVideo {
  return {
    id: ligne.id,
    chapitreId: ligne.chapitre_id,
    cle: ligne.cle,
    uploadId: ligne.upload_id,
    nomFichier: ligne.nom_fichier,
    tailleOctets: Number(ligne.taille_octets),
    taillePartOctets: ligne.taille_part_octets,
    nbParts: ligne.nb_parts,
    dureeSecondes: ligne.duree_secondes,
    parts: ligne.parts ?? [],
    statut: ligne.statut,
    creeLe: ligne.cree_le,
  }
}

// `televersements_video` n'est pas décrite dans le schéma typé : elle ne sert
// qu'ici, et l'y décrire alourdirait `types.ts` pour un seul usage.
const table = () => (supabase() as unknown as { from: (t: string) => any }).from('televersements_video')

export async function ouvrirTeleversement(champs: {
  chapitreId: string
  cle: string
  uploadId: string
  nomFichier: string
  tailleOctets: number
  taillePartOctets: number
  nbParts: number
  dureeSecondes: number
  ouvertPar: string
}): Promise<TeleversementVideo> {
  const { data, error } = await table()
    .insert({
      chapitre_id: champs.chapitreId,
      cle: champs.cle,
      upload_id: champs.uploadId,
      nom_fichier: champs.nomFichier,
      taille_octets: champs.tailleOctets,
      taille_part_octets: champs.taillePartOctets,
      nb_parts: champs.nbParts,
      duree_secondes: champs.dureeSecondes,
      ouvert_par: champs.ouvertPar,
    })
    .select('*')
    .single()

  // L'index unique partiel porte la règle « un seul dépôt vivant par
  // chapitre » : deux dépôts concurrents laisseraient un téléversement
  // orphelin, facturé sans que rien ne le montre.
  if (error?.code === '23505') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Un téléversement est déjà en cours sur ce chapitre.',
    })
  }
  if (error) throw traduireErreur(error, 'ouverture du téléversement')
  return versTeleversement(data)
}

export async function trouverTeleversement(uploadId: string): Promise<TeleversementVideo | null> {
  const ligne = verifierOptionnel(
    await table().select('*').eq('upload_id', uploadId).maybeSingle(),
    'téléversement',
  )
  return ligne ? versTeleversement(ligne as LigneTeleversement) : null
}

export async function televersementEnCours(chapitreId: string): Promise<TeleversementVideo | null> {
  const ligne = verifierOptionnel(
    await table()
      .select('*')
      .eq('chapitre_id', chapitreId)
      .eq('statut', 'en-cours')
      .maybeSingle(),
    'téléversement en cours',
  )
  return ligne ? versTeleversement(ligne as LigneTeleversement) : null
}

/**
 * Miroir des étiquettes déjà obtenues. Le navigateur en garde une copie, mais
 * un cache vidé, un autre poste ou un autre navigateur, et c'est cette table
 * qui permet de reprendre.
 */
export async function noterParts(
  uploadId: string,
  parts: { n: number; etag: string }[],
): Promise<void> {
  verifierUn(
    await table()
      .update({ parts })
      .eq('upload_id', uploadId)
      .eq('statut', 'en-cours')
      .select('id')
      .maybeSingle(),
    'enregistrement des parts',
    'Téléversement introuvable ou déjà clos',
  )
}

export async function cloreTeleversement(
  uploadId: string,
  statut: 'termine' | 'abandonne',
): Promise<void> {
  verifier(
    await table().update({ statut }).eq('upload_id', uploadId).select('id'),
    'clôture du téléversement',
  )
}

/** Dépôts restés en cours au-delà du délai : leurs parts sont facturées tant
 *  qu'elles ne sont pas explicitement abandonnées. */
export async function televersementsEchus(heures: number): Promise<TeleversementVideo[]> {
  const limite = new Date(Date.now() - heures * 60 * 60 * 1000).toISOString()
  const lignes = verifier(
    await table().select('*').eq('statut', 'en-cours').lt('cree_le', limite),
    'téléversements échus',
  ) as LigneTeleversement[]
  return lignes.map(versTeleversement)
}
