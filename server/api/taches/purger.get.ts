import { purgerComptes } from '../../tasks/comptes/purger'
import { exigerCleTache } from '../../utils/taches'

/**
 * Même purge, en GET, pour le cron de Vercel.
 *
 * Un GET qui écrit n'est pas la règle, mais le planificateur de Vercel n'émet
 * que des GET : sans ce verbe, la tâche ne pourrait pas être déclenchée sur
 * cet hébergement. Le garde-fou reste entier — sans l'en-tête `Authorization`
 * portant `TACHES_CLE`, la requête est refusée, donc ni un préchargement de
 * navigateur ni un robot d'indexation ne peuvent la déclencher.
 *
 * Vercel ajoute lui-même cet en-tête aux appels de cron, à partir de la
 * variable `CRON_SECRET` — qui doit donc porter la même valeur que
 * `TACHES_CLE`.
 */
export default defineEventHandler(async (event) => {
  exigerCleTache(event)
  // La réponse ne doit jamais être mise en cache : chaque exécution compte.
  setResponseHeader(event, 'cache-control', 'no-store')
  return await purgerComptes()
})
