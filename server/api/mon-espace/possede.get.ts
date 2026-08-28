import { trouverAcces } from '../../database/comptes'
import { lireSession } from '../../utils/session'

/** Indique si l'utilisateur courant possède déjà le module (état 5 du bloc d'achat). */
export default defineEventHandler(async (event) => {
  const utilisateur = await lireSession(event)
  const { moduleId } = getQuery(event) as { moduleId?: string }
  if (!utilisateur || !moduleId) return { possede: false }
  return { possede: (await trouverAcces(utilisateur.id, moduleId)) !== null }
})
