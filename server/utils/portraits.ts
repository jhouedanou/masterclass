import { supabase } from '../database/client'

/**
 * Portraits des formateurs (planche D, écran 02 : « Changer la photo »).
 *
 * L'image part dans le stockage Supabase, déjà provisionné avec la base : ni
 * système de fichiers — Vercel n'en offre pas d'inscriptible — ni dépendance
 * nouvelle. Le seau est public : un portrait s'affiche sur /formateurs et sur
 * les fiches commerciales, il n'a rien à protéger.
 *
 * Les vidéos, elles, restent sur R2 derrière le Worker : elles se comptent en
 * gigaoctets et demandent une autorisation signée (voir server/utils/video.ts).
 */
export const SEAU_PORTRAITS = 'portraits'

/** Deux mégaoctets suffisent largement à un portrait ; au-delà, c'est une
 *  photo brute qu'il faut redimensionner avant envoi. */
export const TAILLE_MAX_OCTETS = 2 * 1024 * 1024

const TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export function extensionPortrait(type: string): string | null {
  return TYPES[type] ?? null
}

export function typesPortraitLisibles(): string {
  return 'JPEG, PNG ou WebP'
}

let seauVerifie = false

/** Crée le seau au premier envoi. Idempotent : un seau déjà là n'est pas une
 *  erreur, et la vérification ne coûte qu'un appel par démarrage. */
async function assurerSeau(): Promise<void> {
  if (seauVerifie) return
  const { error } = await supabase().storage.createBucket(SEAU_PORTRAITS, {
    public: true,
    fileSizeLimit: TAILLE_MAX_OCTETS,
    allowedMimeTypes: Object.keys(TYPES),
  })
  // « Bucket already exists » est le cas nominal après le premier envoi.
  if (error && !/already exists/i.test(error.message)) {
    throw createError({
      statusCode: 500,
      statusMessage: `Stockage des portraits indisponible (${error.message}).`,
    })
  }
  seauVerifie = true
}

/**
 * Dépose le portrait et rend son adresse publique. Le nom porte l'identifiant
 * du formateur et l'horodatage : le remplacement ne se heurte pas au cache du
 * CDN, et l'ancien fichier reste consultable le temps que les pages se
 * rafraîchissent.
 */
export async function televerserPortrait(
  formateurId: string,
  fichier: { donnees: Buffer; type: string },
): Promise<string> {
  const extension = extensionPortrait(fichier.type)
  if (!extension) {
    throw createError({
      statusCode: 415,
      statusMessage: `Format d’image non accepté : ${typesPortraitLisibles()}.`,
    })
  }
  if (fichier.donnees.byteLength > TAILLE_MAX_OCTETS) {
    throw createError({ statusCode: 413, statusMessage: 'Image trop lourde : 2 Mo au maximum.' })
  }

  await assurerSeau()

  const chemin = `${formateurId}/${Date.now()}.${extension}`
  const { error } = await supabase()
    .storage.from(SEAU_PORTRAITS)
    .upload(chemin, fichier.donnees, { contentType: fichier.type, upsert: true })
  if (error) {
    throw createError({ statusCode: 502, statusMessage: `Envoi du portrait impossible (${error.message}).` })
  }

  return supabase().storage.from(SEAU_PORTRAITS).getPublicUrl(chemin).data.publicUrl
}
