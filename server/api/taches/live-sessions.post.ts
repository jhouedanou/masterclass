import { cycleLiveSessions } from '../../tasks/live/cycle'
import { exigerCleTache } from '../../utils/taches'

/**
 * Cycle des Live Sessions (CDC §7), toutes les 5 minutes. Sur Vercel (offre
 * Hobby : un cron par jour au plus), il est appelé par pg_cron depuis
 * Supabase (supabase/planification-live.sql), avec `TACHES_CLE` en en-tête
 * `Authorization`. GET et POST font la même chose.
 */
export default defineEventHandler(async (event) => {
  exigerCleTache(event)
  setResponseHeader(event, 'cache-control', 'no-store')
  return await cycleLiveSessions()
})
