import { sessionsFormateur } from '../../utils/formateur'
import { exigerFormateur } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const utilisateur = await exigerFormateur(event)
  return await sessionsFormateur(utilisateur.formateurId!)
})
