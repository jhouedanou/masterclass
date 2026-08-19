import { acces } from '../../data/db'
import { lireSession } from '../../utils/session'

/** Indique si l'utilisateur courant possède déjà le module (état 5 du bloc d'achat). */
export default defineEventHandler((event) => {
  const utilisateur = lireSession(event)
  const { moduleId } = getQuery(event) as { moduleId?: string }
  if (!utilisateur || !moduleId) return { possede: false }
  return {
    possede: acces.some((a) => a.utilisateurId === utilisateur.id && a.moduleId === moduleId),
  }
})
