import { listerDemandesCoachingPrive } from '../../../database/coaching'
import { exigerAdmin } from '../../../utils/session'

/**
 * Compteur léger pour la barre latérale (planche C, écran 01 : « Coaching
 * privé 3 ») : le nombre de demandes en attente, sans le détail que rend
 * `/api/admin/coaching-prive`.
 */
export default defineEventHandler(async (event) => {
  await exigerAdmin(event)
  const demandes = await listerDemandesCoachingPrive()
  return { enAttente: demandes.filter((d) => d.statut === 'en-attente').length }
})
