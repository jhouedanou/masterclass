import { purgerComptes } from '../../tasks/comptes/purger'
import { purgerTeleversements } from '../../tasks/video/purger'
import { exigerCleTache } from '../../utils/taches'

/**
 * Déclencheur externe de la purge des comptes, pour les hébergements sans
 * processus permanent (GitHub Actions, cron-job.org…). Clé partagée en
 * en-tête Bearer : `TACHES_CLE`.
 *
 * Le cron Vercel, lui, n'émet que des GET : il passe par `purger.get.ts`.
 */
export default defineEventHandler(async (event) => {
  exigerCleTache(event)
  // Même passe : les téléversements vidéo restés en plan occupent le
  // stockage et sont facturés tant qu'ils ne sont pas abandonnés.
  const [comptes, videos] = await Promise.all([purgerComptes(), purgerTeleversements()])
  return { ...comptes, ...videos }
})
