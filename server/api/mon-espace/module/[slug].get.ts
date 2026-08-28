import {
  listerThematiques,
  trouverFormateur,
  trouverModuleParSlug,
  trouverProgramme,
} from '../../../database/catalogue'
import { trouverAcces } from '../../../database/comptes'
import { exigerUtilisateur } from '../../../utils/session'

/** Contenu réservé : seul un module acquis est consultable dans l'espace apprenant. */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const slug = getRouterParam(event, 'slug')

  const moduleTrouve = await trouverModuleParSlug(slug ?? '')
  if (!moduleTrouve) {
    throw createError({ statusCode: 404, statusMessage: 'Module introuvable' })
  }

  const ligne = await trouverAcces(utilisateur.id, moduleTrouve.id)
  if (!ligne) {
    throw createError({ statusCode: 403, statusMessage: 'Ce module ne fait pas partie de vos accès' })
  }

  const [formateur, thematiques, programme] = await Promise.all([
    trouverFormateur(moduleTrouve.formateurId),
    listerThematiques(),
    trouverProgramme(moduleTrouve.programme),
  ])

  return {
    module: moduleTrouve,
    acces: ligne,
    formateur,
    thematique: thematiques.find((t) => t.id === moduleTrouve.thematiqueId) ?? null,
    programme,
  }
})
