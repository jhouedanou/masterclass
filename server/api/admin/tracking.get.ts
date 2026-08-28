import { lireReglagesTracking } from '../../database/backoffice'
import { exigerAdmin } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const utilisateur = await exigerAdmin(event)
  const reglages = await lireReglagesTracking()

  // Le code personnalisé s'injecte dans le <head> : seul un administrateur
  // supérieur peut le lire, comme le prévoit la maquette.
  if (utilisateur.role !== 'admin-superieur') {
    return { ...reglages, codePersonnalise: '', role: utilisateur.role }
  }
  return { ...reglages, role: utilisateur.role }
})
