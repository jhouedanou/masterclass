import { deposerPhoto } from '../../../database/comptes'
import { PHOTO_TAILLE_MAX, PHOTO_TAILLE_MAX_LIBELLE, reconnaitrePhoto } from '../../../utils/photos'
import { exigerUtilisateur } from '../../../utils/session'

/**
 * Photo de profil (planche B, écran 04) : dépôt d'un portrait.
 *
 * Le fichier arrive en `multipart/form-data`, champ `photo`. Le compte visé
 * est toujours celui de la session — aucun identifiant n'est lu dans le corps,
 * sinon un apprenant connecté pourrait remplacer la photo d'un autre.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)

  // Première borne, avant de mettre quoi que ce soit en mémoire : un en-tête
  // de taille déjà hors limites dispense de lire le corps.
  const annonce = Number(getRequestHeader(event, 'content-length') ?? 0)
  if (annonce > PHOTO_TAILLE_MAX * 1.1) {
    throw createError({
      statusCode: 413,
      statusMessage: `Photo trop lourde : ${PHOTO_TAILLE_MAX_LIBELLE} maximum`,
    })
  }

  const parties = await readMultipartFormData(event)
  const fichier = parties?.find((p) => p.name === 'photo' && p.filename)
  if (!fichier?.data?.length) {
    throw createError({ statusCode: 422, statusMessage: 'Aucun fichier reçu' })
  }

  // Seconde borne, sur les octets réellement reçus : `content-length` vient du
  // client, il ne prouve rien.
  if (fichier.data.length > PHOTO_TAILLE_MAX) {
    throw createError({
      statusCode: 413,
      statusMessage: `Photo trop lourde : ${PHOTO_TAILLE_MAX_LIBELLE} maximum`,
    })
  }

  // Le format est lu dans les octets, jamais dans l'extension ni dans le
  // `Content-Type` de la partie : tous deux sont fournis par le navigateur.
  const format = reconnaitrePhoto(fichier.data)
  if (!format) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Format non accepté : déposez une image JPEG, PNG ou WebP',
    })
  }

  const compte = await deposerPhoto(utilisateur.id, fichier.data, format)
  return { utilisateur: compte }
})
