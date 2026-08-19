import { sessionsFormateur } from '../../utils/formateur'
import { exigerFormateur } from '../../utils/session'

export default defineEventHandler((event) => {
  const utilisateur = exigerFormateur(event)
  return sessionsFormateur(utilisateur.formateurId!)
})
