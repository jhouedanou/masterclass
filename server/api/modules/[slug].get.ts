import {
  listerModules,
  listerThematiques,
  trouverFormateur,
  trouverModuleParSlug,
  trouverProgramme,
} from '../../database/catalogue'
import { formateurPublic, modulePublic } from '../../utils/public'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const moduleTrouve = await trouverModuleParSlug(slug ?? '')
  if (!moduleTrouve || moduleTrouve.statut === 'brouillon') {
    throw createError({ statusCode: 404, statusMessage: 'Module introuvable' })
  }

  const [formateur, thematiques, programme, modules] = await Promise.all([
    trouverFormateur(moduleTrouve.formateurId),
    listerThematiques(),
    trouverProgramme(moduleTrouve.programme),
    listerModules(),
  ])

  const memeThematique = modules.filter(
    (m) => m.thematiqueId === moduleTrouve.thematiqueId && m.statut !== 'brouillon',
  )

  return {
    module: modulePublic(moduleTrouve),
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
