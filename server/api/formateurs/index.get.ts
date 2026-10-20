import { listerFormateurs, listerModules, listerThematiques } from '../../database/catalogue'
import { estDisponible, formateurPublic } from '../../utils/public'

export default defineEventHandler(async () => {
  const [formateurs, modules, thematiques] = await Promise.all([
    listerFormateurs(),
    listerModules(),
    listerThematiques(),
  ])

  // Un formateur sans module disponible n'est pas présenté : la page ne peut
  // rien proposer d'acheter avec lui.
  return formateurs.flatMap((f) => {
    const siens = modules.filter((m) => m.formateurId === f.id && estDisponible(m))
    if (!siens.length) return []
    return [{
      ...formateurPublic(f),
      nbModules: siens.length,
      modules: siens.map((m) => ({
        id: m.id,
        slug: m.slug,
        titre: m.titre,
        numero: m.numero,
        programme: m.programme,
        thematique: thematiques.find((t) => t.id === m.thematiqueId)?.nom ?? '',
      })),
    }]
  })
})
