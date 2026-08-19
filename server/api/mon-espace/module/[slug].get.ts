import { acces, formateurs, modules, programmes, thematiques } from '../../../data/db'
import { exigerUtilisateur } from '../../../utils/session'

/** Contenu réservé : seul un module acquis est consultable dans l'espace apprenant. */
export default defineEventHandler((event) => {
  const utilisateur = exigerUtilisateur(event)
  const slug = getRouterParam(event, 'slug')

  const moduleTrouve = modules.find((m) => m.slug === slug)
  if (!moduleTrouve) {
    throw createError({ statusCode: 404, statusMessage: 'Module introuvable' })
  }

  const ligne = acces.find(
    (a) => a.utilisateurId === utilisateur.id && a.moduleId === moduleTrouve.id,
  )
  if (!ligne) {
    throw createError({ statusCode: 403, statusMessage: 'Ce module ne fait pas partie de vos accès' })
  }

  return {
    module: moduleTrouve,
    acces: ligne,
    formateur: formateurs.find((f) => f.id === moduleTrouve.formateurId) ?? null,
    thematique: thematiques.find((t) => t.id === moduleTrouve.thematiqueId) ?? null,
    programme: programmes.find((p) => p.slug === moduleTrouve.programme) ?? null,
  }
})
