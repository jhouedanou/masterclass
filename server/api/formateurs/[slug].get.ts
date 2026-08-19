import { formateurs, modules } from '../../data/db'

export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug')
  const formateur = formateurs.find((f) => f.slug === slug)
  if (!formateur) {
    throw createError({ statusCode: 404, statusMessage: 'Formateur introuvable' })
  }
  return {
    formateur,
    modules: modules.filter((m) => m.formateurId === formateur.id && m.statut !== 'brouillon'),
  }
})
