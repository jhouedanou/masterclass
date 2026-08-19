import { formateurs, modules, programmes, thematiques } from '../../data/db'

export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug')
  const moduleTrouve = modules.find((m) => m.slug === slug)
  if (!moduleTrouve || moduleTrouve.statut === 'brouillon') {
    throw createError({ statusCode: 404, statusMessage: 'Module introuvable' })
  }
  const formateur = formateurs.find((f) => f.id === moduleTrouve.formateurId) ?? null
  return {
    module: moduleTrouve,
    formateur,
    thematique: thematiques.find((t) => t.id === moduleTrouve.thematiqueId) ?? null,
    programme: programmes.find((p) => p.slug === moduleTrouve.programme) ?? null,
    // « 3 modules disponibles dans la thématique … » affiché sous le formateur.
    nbModulesThematique: modules.filter(
      (m) => m.thematiqueId === moduleTrouve.thematiqueId && m.statut !== 'brouillon',
    ).length,
    similaires: modules
      .filter((m) => m.id !== moduleTrouve.id && m.thematiqueId === moduleTrouve.thematiqueId)
      .filter((m) => m.statut !== 'brouillon')
      .slice(0, 3),
  }
})
