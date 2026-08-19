import { formateurs, modules, thematiques } from '../../data/db'

export default defineEventHandler(() =>
  formateurs.map((f) => {
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
  }),
)
