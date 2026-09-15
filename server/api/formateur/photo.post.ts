import { majFormateur, trouverFormateur } from '../../database/catalogue'
import { SEAU_PORTRAITS, cheminDansSeau, effacerImage, lireImageDeposee, televerserImage, urlPhoto } from '../../utils/photos'
import { exigerFormateur } from '../../utils/session'

/** « Changer la photo » (planche D, écran 02). L'image remplace le portrait
 *  publié sur /formateurs et sur le bloc 8 des fiches commerciales. */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerFormateur(event)
  const formateurId = utilisateur.formateurId!
  const formateur = await trouverFormateur(formateurId)
  if (!formateur) {
    throw createError({ statusCode: 404, statusMessage: 'Profil introuvable' })
  }

  const { contenu, format } = await lireImageDeposee(event, SEAU_PORTRAITS)
  const chemin = await televerserImage(SEAU_PORTRAITS, formateurId, contenu, format)

  // La colonne garde une adresse affichable, pas un chemin : elle est `not null`
  // et les formateurs installés par le seed pointent vers un fichier du site.
  const url = urlPhoto(SEAU_PORTRAITS, chemin)
  if (!url) {
    await effacerImage(SEAU_PORTRAITS, chemin)
    throw createError({ statusCode: 500, statusMessage: 'Adresse du stockage introuvable' })
  }

  let profil
  try {
    profil = await majFormateur(formateurId, { photo: url })
  } catch (erreur) {
    // La base a refusé : le fichier tout juste déposé n'est rattaché à rien.
    await effacerImage(SEAU_PORTRAITS, chemin)
    throw erreur
  }

  // Le portrait précédent n'est effacé qu'une fois le nouveau en place. Rien à
  // faire si c'était une image du site : `cheminDansSeau` ne rend un chemin que
  // pour ce qui vient bien du seau.
  await effacerImage(SEAU_PORTRAITS, cheminDansSeau(SEAU_PORTRAITS, formateur.photo))
  return profil
})
