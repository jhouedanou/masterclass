import { listerFormateurs, listerModules, listerThematiques } from '../../database/catalogue'
import { estDisponible, formateurPublic } from '../../utils/public'

export default defineEventHandler(async (event) => {
  // L'accueil présente toute l'équipe (brief du 02/11) : fiches complètes,
  // module disponible ou non. La page /formateurs garde sa règle.
  const { equipe } = getQuery(event) as { equipe?: string }
  const [formateurs, modules, thematiques] = await Promise.all([
    listerFormateurs(),
    listerModules(),
    listerThematiques(),
  ])

  // Un formateur sans module disponible n'est pas présenté : la page ne peut
  // rien proposer d'acheter avec lui.
  return formateurs.flatMap((f) => {
    const siens = modules.filter((m) => m.formateurId === f.id && estDisponible(m))
    if (!siens.length && !(equipe && f.ficheComplete)) return []
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
