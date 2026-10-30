import {
  listerModules,
  listerThematiques,
  trouverFormateur,
  trouverModuleParSlug,
  trouverProgramme,
} from '../../database/catalogue'
import { contexteLivePublic, statutModuleAffiche } from '../../utils/live'
import { estDisponible, formateurPublic, modulePublic } from '../../utils/public'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const moduleTrouve = await trouverModuleParSlug(slug ?? '')
  if (!moduleTrouve || moduleTrouve.statut === 'brouillon') {
    throw createError({ statusCode: 404, statusMessage: 'Module introuvable' })
  }

  const [formateur, thematiques, programme, modules, live] = await Promise.all([
    trouverFormateur(moduleTrouve.formateurId),
    listerThematiques(),
    trouverProgramme(moduleTrouve.programme),
    listerModules(),
    contexteLivePublic(event),
  ])

  const memeThematique = modules.filter(
    (m) => m.thematiqueId === moduleTrouve.thematiqueId && estDisponible(m),
  )

  const session = live.parModule.get(moduleTrouve.id)
  return {
    module: { ...modulePublic(moduleTrouve), statut: statutModuleAffiche(moduleTrouve.statut, live.visible) },
    // Module en Live Session : la page redirige (302) vers la fiche de la
    // session (CDC §5.3).
    redirectionLive: session ? `/live-sessions/${session.slug}` : null,
    formateur: formateur ? formateurPublic(formateur) : null,
    thematique: thematiques.find((t) => t.id === moduleTrouve.thematiqueId) ?? null,
    programme,
    // « 3 modules disponibles dans la thématique … » affiché sous le formateur.
    nbModulesThematique: memeThematique.length,
    // `similaires` a été retiré : la route expédiait trois modules entiers,
    // transcriptions comprises, qu'aucune vue ne lisait. Seul le compte
    // ci-dessus est affiché.
  }
})
