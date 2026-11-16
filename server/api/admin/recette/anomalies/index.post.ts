import { signalerAnomalieRecette } from '../../../../database/recette'
import { exigerAdmin } from '../../../../utils/session'

const PAGE_MAX = 300
const DESCRIPTION_MAX = 2000

/**
 * Signale une anomalie hors des contrôles prévus. Le testeur est celui de la
 * session, jamais un identifiant reçu du navigateur.
 */
export default defineEventHandler(async (event) => {
  const testeur = await exigerAdmin(event)
  const corps = await readBody<{ page?: string; description?: string }>(event)
  const page = typeof corps?.page === 'string' ? corps.page.trim() : ''
  const description = typeof corps?.description === 'string' ? corps.description.trim() : ''

  if (!description) {
    throw createError({ statusCode: 422, statusMessage: 'Décrivez l’anomalie' })
  }
  if (description.length > DESCRIPTION_MAX) {
    throw createError({ statusCode: 422, statusMessage: `Description trop longue (${DESCRIPTION_MAX} caractères au plus)` })
  }
  if (page.length > PAGE_MAX) {
    throw createError({ statusCode: 422, statusMessage: `Page trop longue (${PAGE_MAX} caractères au plus)` })
  }

  const id = await signalerAnomalieRecette(testeur.id, page, description)
  return { id }
})
