import { auteurAnomalieRecette, marquerAnomalieRecette } from '../../../../database/recette'
import { exigerAdmin } from '../../../../utils/session'

/**
 * Déclare une anomalie corrigée, ou la rouvre. Tout compte d'administration
 * peut le faire : c'est l'équipe qui corrige, pas forcément celui qui a signalé.
 */
export default defineEventHandler(async (event) => {
  await exigerAdmin(event)
  const id = getRouterParam(event, 'id') ?? ''
  const corps = await readBody<{ corrigee?: boolean }>(event)
  if (typeof corps?.corrigee !== 'boolean') {
    throw createError({ statusCode: 422, statusMessage: 'Indiquer si l’anomalie est corrigée' })
  }
  if (!(await auteurAnomalieRecette(id))) {
    throw createError({ statusCode: 404, statusMessage: 'Anomalie introuvable' })
  }

  await marquerAnomalieRecette(id, corps.corrigee)
  return { id, corrigee: corps.corrigee }
})
