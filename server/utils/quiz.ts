import type { H3Event } from 'h3'
import type { Acces, Module, Utilisateur } from '#shared/types'
import { trouverModuleParSlug } from '../database/catalogue'
import { trouverAcces } from '../database/comptes'
import { exigerUtilisateur } from './session'

/**
 * Garde commune aux routes du quiz : apprenant connecté, module trouvé par son
 * slug et possédé — accès non révoqué —, comme la fiche module et le lecteur.
 */
export async function exigerModuleAcquis(
  event: H3Event,
): Promise<{ utilisateur: Utilisateur; module: Module; acces: Acces }> {
  const utilisateur = await exigerUtilisateur(event)
  const module = await trouverModuleParSlug(getRouterParam(event, 'slug') ?? '')
  if (!module) {
    throw createError({ statusCode: 404, statusMessage: 'Module introuvable' })
  }
  const acces = await trouverAcces(utilisateur.id, module.id)
  if (!acces || acces.revoqueLe) {
    throw createError({ statusCode: 403, statusMessage: 'Ce module ne fait pas partie de vos accès' })
  }
  return { utilisateur, module, acces }
}
