import type { H3Event } from 'h3'
import { memeSecret } from './secrets'

/**
 * Déclencheurs externes des tâches planifiées.
 *
 * Sur un serveur Node, Nitro exécute lui-même `scheduledTasks` (voir
 * `nuxt.config.ts`). Sur un hébergement sans processus permanent — Vercel —
 * rien ne tourne entre deux requêtes : la tâche doit être appelée de
 * l'extérieur, par un cron, et cet appel doit être authentifié.
 */

/**
 * Exige la clé partagée `TACHES_CLE`, en en-tête `Authorization: Bearer …`.
 *
 * Refuse aussi quand la clé n'est pas configurée : une clé vide qui laisserait
 * passer ouvrirait la purge définitive des comptes au premier venu. Porte
 * fermée par défaut.
 *
 * La comparaison est à temps constant (`memeSecret`) : `!==` s'arrêtait au
 * premier caractère différent, et la durée du refus guidait une recherche de
 * la clé caractère par caractère.
 */
export function exigerCleTache(event: H3Event): void {
  const cle = (useRuntimeConfig().tachesCle || '').trim()
  const entete = getRequestHeader(event, 'authorization') ?? ''

  if (!cle || !memeSecret(entete, `Bearer ${cle}`)) {
    throw createError({ statusCode: 401, statusMessage: 'Clé de tâche invalide' })
  }
}
