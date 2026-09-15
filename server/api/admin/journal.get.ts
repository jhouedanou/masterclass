import { listerJournal } from '../../database/administration'
import { exigerAdmin } from '../../utils/session'

/**
 * Journal des actions (écran 16).
 *
 * Les filtres sont appliqués ici plutôt que côté navigateur : le journal grossit
 * sans limite, et le charger en entier pour en afficher dix lignes deviendra vite
 * coûteux. Les valeurs proposées sont celles réellement présentes — une liste
 * figée finirait par offrir des filtres qui ne renvoient rien.
 */
export default defineEventHandler(async (event) => {
  await exigerAdmin(event)
  const { auteur, type, objet } = getQuery(event) as Record<string, string | undefined>

  const entrees = await listerJournal()

  return {
    entrees: entrees
      .filter((e) => !auteur || e.auteur === auteur)
      .filter((e) => !type || e.type === type)
      .filter((e) => !objet || e.objet === objet),
    auteurs: [...new Set(entrees.map((e) => e.auteur))].sort(),
    types: [...new Set(entrees.map((e) => e.type).filter(Boolean))].sort(),
    objets: [...new Set(entrees.map((e) => e.objet).filter(Boolean))].sort(),
  }
})
