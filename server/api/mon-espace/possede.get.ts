import { trouverAcces } from '../../database/comptes'
import { lireSession } from '../../utils/session'

/** Indique si l'utilisateur courant possède déjà le module (état 5 du bloc d'achat). */
export default defineEventHandler(async (event) => {
  const utilisateur = await lireSession(event)
  const { moduleId } = getQuery(event) as { moduleId?: string }
  if (!utilisateur || !moduleId) return { possede: false }
  // Un accès révoqué ne compte pas : la commande le rachète (commandes.post.ts)
  // et la fiche doit alors émettre ViewContent et proposer l'achat.
  const acces = await trouverAcces(utilisateur.id, moduleId)
  return { possede: acces !== null && !acces.revoqueLe }
})
