import { ficheFormateur } from '../../utils/formateur'
import { exigerFormateur } from '../../utils/session'

export default defineEventHandler((event) => {
  const utilisateur = exigerFormateur(event)
  return ficheFormateur(utilisateur.formateurId!)
})
