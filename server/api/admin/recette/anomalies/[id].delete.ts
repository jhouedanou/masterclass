import { auteurAnomalieRecette, supprimerAnomalieRecette } from '../../../../database/recette'
import { exigerAdmin } from '../../../../utils/session'

/** Retire une anomalie. Seul celui qui l'a signalée peut la retirer. */
export default defineEventHandler(async (event) => {
  const testeur = await exigerAdmin(event)
  const id = getRouterParam(event, 'id') ?? ''
  const auteur = await auteurAnomalieRecette(id)
  if (!auteur) {
    throw createError({ statusCode: 404, statusMessage: 'Anomalie introuvable' })
  }
  if (auteur !== testeur.id) {
    throw createError({ statusCode: 403, statusMessage: 'Seul l’auteur peut retirer cette anomalie' })
  }

  await supprimerAnomalieRecette(id)
  return { id }
})
