import { deposerPhoto } from '../../../database/comptes'
import { SEAU_PHOTOS_PROFIL, lireImageDeposee } from '../../../utils/photos'
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
  const { contenu, format } = await lireImageDeposee(event, SEAU_PHOTOS_PROFIL)
  const compte = await deposerPhoto(utilisateur.id, contenu, format)
  return { utilisateur: compte }
})
