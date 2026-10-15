import { relancerCommandes } from '../../tasks/commerce/relancer'
import { exigerCleTache } from '../../utils/taches'

/**
 * Déclencheur externe de la relance des commandes en attente, pour un
 * rythme plus serré que le cron quotidien de Vercel (GitHub Actions,
 * cron-job.org…). Clé partagée en en-tête Bearer : `TACHES_CLE`.
 */
export default defineEventHandler(async (event) => {
  exigerCleTache(event)
  return await relancerCommandes()
})
