import { listerModules, trouverFormateurParSlug } from '../../database/catalogue'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const formateur = await trouverFormateurParSlug(slug ?? '')
  if (!formateur) {
    throw createError({ statusCode: 404, statusMessage: 'Formateur introuvable' })
  }

  const modules = await listerModules()
  return {
    formateur,
    modules: modules.filter((m) => m.formateurId === formateur.id && m.statut !== 'brouillon'),
  }
})
