import { listerCertificatsUtilisateur } from '../../database/commerce'
import { exigerUtilisateur } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  return await listerCertificatsUtilisateur(utilisateur.id)
})
