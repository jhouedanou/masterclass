import type { Recette } from '#shared/types'
import { recette } from '../../../data/recette'
import { listerResultatsRecette } from '../../../database/recette'
import { exigerAdmin } from '../../../utils/session'

/**
 * Recette partagée : la liste des contrôles et les résultats de tous les
 * testeurs. Ouverte à tout compte d'administration, sans section — un compte
 * de contenu créé sans aucune section sert de compte testeur.
 */
export default defineEventHandler(async (event): Promise<Recette> => {
  await exigerAdmin(event)
  const resultats = await listerResultatsRecette()
  return { ...recette, resultats: resultats ?? [], pret: resultats !== null }
})
