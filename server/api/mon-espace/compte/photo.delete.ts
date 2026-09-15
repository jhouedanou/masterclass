import { retirerPhoto } from '../../../database/comptes'
import { exigerUtilisateur } from '../../../utils/session'

/** Retrait de la photo de profil : le compte retombe sur ses initiales. */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  return { utilisateur: await retirerPhoto(utilisateur.id) }
})
