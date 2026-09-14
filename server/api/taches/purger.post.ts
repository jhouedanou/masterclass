import { purgerComptes } from '../../tasks/comptes/purger'

/**
 * Déclencheur externe de la purge des comptes, pour les hébergements sans
 * processus permanent (cron Vercel, GitHub Actions…). Clé partagée en
 * en-tête Bearer : `TACHES_CLE`.
 */
export default defineEventHandler(async (event) => {
  const cle = (useRuntimeConfig().tachesCle || '').trim()
  const entete = getRequestHeader(event, 'authorization') ?? ''
  if (!cle || entete !== `Bearer ${cle}`) {
    throw createError({ statusCode: 401, statusMessage: 'Clé de tâche invalide' })
  }
  return await purgerComptes()
})
