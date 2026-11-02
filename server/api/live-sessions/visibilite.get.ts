import { liveVisiblePour, visibiliteLive } from '../../utils/live'
import { lireSession } from '../../utils/session'

/**
 * La fonctionnalité Live Sessions est-elle visible pour ce visiteur (10.G) ?
 * Le menu, le pied de page, l'accueil et l'espace formateur s'y règlent.
 */
export default defineEventHandler(async (event) => {
  const [visibilite, utilisateur] = await Promise.all([visibiliteLive(), lireSession(event)])
  setResponseHeader(event, 'cache-control', 'private, no-store')
  return { visible: liveVisiblePour(visibilite, utilisateur) }
})
