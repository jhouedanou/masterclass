import type { Recette } from '#shared/types'
import { recette } from '../../../data/recette'
import { listerAnomaliesRecette, listerResultatsRecette } from '../../../database/recette'
import { exigerAdmin } from '../../../utils/session'

/**
 * Recette partagée : la liste des contrôles, les résultats de tous les
 * testeurs et les anomalies signalées hors contrôles. Ouverte à tout compte
 * d'administration, sans section — un compte de contenu créé sans aucune
 * section sert de compte testeur.
 */
export default defineEventHandler(async (event): Promise<Recette> => {
  await exigerAdmin(event)
  const [resultats, anomalies] = await Promise.all([listerResultatsRecette(), listerAnomaliesRecette()])
  return {
    ...recette,
    resultats: resultats ?? [],
    pret: resultats !== null,
    anomalies: anomalies ?? [],
    anomaliesPretes: anomalies !== null,
  }
})
