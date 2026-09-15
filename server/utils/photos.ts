/**
 * Photos de profil : seau de stockage, URL publique et contrôle du format.
 *
 * Ce module ne parle pas à la base — il est importé par les mappers, qui
 * doivent rester purs — et ne dépend que de l'adresse du projet Supabase.
 */

/** Seau créé par la migration `…_photo_profil.sql`. */
export const SEAU_PHOTOS = 'photos-profil'

/** 512 kilooctets : la même borne est posée sur le seau, côté Supabase. */
export const PHOTO_TAILLE_MAX = 512 * 1024

/** Le même plafond, écrit pour l'affichage. */
export const PHOTO_TAILLE_MAX_LIBELLE = '512 ko'

/**
 * Formats acceptés. Le SVG en est délibérément absent : un SVG est un document
 * qui peut porter du script, et servi depuis une origine publique il
 * exécuterait ce script au nom du visiteur. Le GIF et le BMP sont écartés
 * faute d'usage pour un portrait.
 */
export type FormatPhoto = { type: string; extension: string }

const FORMATS: { signature: (o: Buffer) => boolean; format: FormatPhoto }[] = [
  {
    // JPEG : marqueur SOI suivi du premier marqueur de segment.
    signature: (o) => o[0] === 0xff && o[1] === 0xd8 && o[2] === 0xff,
    format: { type: 'image/jpeg', extension: 'jpg' },
  },
  {
    // PNG : signature de huit octets, dont le CRLF qui détecte les transferts
    // en mode texte.
    signature: (o) =>
      o[0] === 0x89 && o[1] === 0x50 && o[2] === 0x4e && o[3] === 0x47 &&
      o[4] === 0x0d && o[5] === 0x0a && o[6] === 0x1a && o[7] === 0x0a,
    format: { type: 'image/png', extension: 'png' },
  },
  {
    // WebP : conteneur RIFF dont le type de flux, en huitième position, est
    // « WEBP ». Sans ce second contrôle, n'importe quel RIFF (un AVI, un WAV)
    // passerait.
    signature: (o) =>
      o.subarray(0, 4).toString('latin1') === 'RIFF' &&
      o.subarray(8, 12).toString('latin1') === 'WEBP',
    format: { type: 'image/webp', extension: 'webp' },
  },
]

/**
 * Format réel d'un fichier déposé, lu dans ses premiers octets.
 *
 * Ni l'extension ni l'en-tête `Content-Type` ne sont consultés : tous deux
 * viennent du navigateur et se falsifient. Renvoie `null` si les octets ne
 * correspondent à aucun format accepté.
 */
export function reconnaitrePhoto(contenu: Buffer): FormatPhoto | null {
  if (contenu.length < 12) return null
  return FORMATS.find((f) => f.signature(contenu))?.format ?? null
}

/**
 * URL publique d'une photo. Reconstruite à partir de `SUPABASE_URL` plutôt que
 * stockée en base : le chemin conservé reste valable si le projet change.
 *
 * Même priorité que le client Supabase : l'environnement d'exécution prime sur
 * la valeur figée au build.
 */
export function urlPhoto(chemin: string | null | undefined): string | undefined {
  if (!chemin) return undefined
  const base = (process.env.SUPABASE_URL || useRuntimeConfig().supabaseUrl || '').replace(/\/+$/, '')
  if (!base) return undefined
  return `${base}/storage/v1/object/public/${SEAU_PHOTOS}/${chemin}`
}
