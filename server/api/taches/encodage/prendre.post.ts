import { prendreTravail } from '../../../database/encodage'
import { exigerCleTache } from '../../../utils/taches'

/**
 * Saisit un travail d'encodage pour l'exécutant appelant.
 *
 * Authentifiée par `TACHES_CLE`, comme la purge des comptes : l'exécutant n'est
 * pas un administrateur connecté, c'est un processus. Il ne reçoit d'ailleurs
 * que ce qu'il lui faut — l'identifiant du travail et la clé du dossier —, pas
 * un accès à l'administration.
 *
 * Répond `204` quand la file est vide, ce qui évite à l'exécutant d'avoir à
 * distinguer « rien à faire » d'une erreur.
 */
export default defineEventHandler(async (event) => {
  exigerCleTache(event)

  const travail = await prendreTravail({
    minutesAbandon: Number(process.env.ENCODAGE_MINUTES_ABANDON) || 60,
    tentativesMax: Number(process.env.ENCODAGE_TENTATIVES_MAX) || 3,
  })

  if (!travail) {
    setResponseStatus(event, 204)
    return null
  }

  return travail
})
