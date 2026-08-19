import { statistiquesModules } from '../../utils/formateur'
import { exigerFormateur } from '../../utils/session'

export default defineEventHandler((event) => {
  const utilisateur = exigerFormateur(event)
  return statistiquesModules(utilisateur.formateurId!)
})
