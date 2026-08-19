import { redirections } from '../data/db'

/** Applique les redirections permanentes créées lors des changements de slug. */
export default defineEventHandler((event) => {
  const chemin = event.path.split('?')[0]
  const regle = redirections.find((r) => r.de === chemin)
  if (regle) {
    return sendRedirect(event, regle.vers, 301)
  }
})
