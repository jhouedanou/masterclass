import { formateurs, modules, programmes, thematiques } from '../../data/db'

export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug')
  const programme = programmes.find((p) => p.slug === slug)
  if (!programme) {
    throw createError({ statusCode: 404, statusMessage: 'Programme introuvable' })
  }
  return {
    programme,
    // Les thématiques sont des sections de la page programme (spec SEO §1).
    thematiques: thematiques
      .filter((t) => t.programme === programme.slug)
      .sort((a, b) => a.numero - b.numero)
      .map((t) => ({
        ...t,
        modules: modules
          .filter((m) => m.thematiqueId === t.id && m.statut !== 'brouillon')
          .sort((a, b) => a.numero - b.numero)
          .map((m) => ({
            ...m,
            formateur: formateurs.find((f) => f.id === m.formateurId) ?? null,
          })),
      })),
  }
})
