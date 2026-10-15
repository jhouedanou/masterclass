import { relancerCommandes } from '../../tasks/commerce/relancer'
import { exigerCleTache } from '../../utils/taches'

/**
 * Relance des commandes en attente, en GET pour le cron de Vercel (même
 * garde-fou que `purger.get.ts` : en-tête `Authorization` portant `TACHES_CLE`).
 */
export default defineEventHandler(async (event) => {
  exigerCleTache(event)
  setResponseHeader(event, 'cache-control', 'no-store')
  return await relancerCommandes()
})
