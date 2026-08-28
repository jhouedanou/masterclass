import { listerFormateurs, listerModules, listerThematiques } from '../../database/catalogue'

export default defineEventHandler(async () => {
  const [formateurs, modules, thematiques] = await Promise.all([
    listerFormateurs(),
    listerModules(),
    listerThematiques(),
  ])

  return formateurs.map((f) => {
    const siens = modules.filter((m) => m.formateurId === f.id && m.statut !== 'brouillon')
    return {
      ...f,
      nbModules: siens.length,
      modules: siens.map((m) => ({
        id: m.id,
        slug: m.slug,
        titre: m.titre,
        numero: m.numero,
        programme: m.programme,
        thematique: thematiques.find((t) => t.id === m.thematiqueId)?.nom ?? '',
      })),
    }
  })
})
