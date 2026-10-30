import { supportLive, trouverInscriptionLive, trouverSessionLive } from '../../../../database/live'
import { estAdmin, exigerLiveVisible, urlSupportSignee } from '../../../../utils/live'
import { exigerUtilisateur } from '../../../../utils/session'

/**
 * Support de cours d'une Live Session (RM5) : aux inscrits payants, sans
 * autre condition, une fois la session terminée. URL signée de 10 minutes.
 */
export default defineEventHandler(async (event) => {
  await exigerLiveVisible(event)
  const utilisateur = await exigerUtilisateur(event)
  const session = await trouverSessionLive(getRouterParam(event, 'id') ?? '')
  if (!session) throw createError({ statusCode: 404, statusMessage: 'Live Session introuvable' })
  const formateur = utilisateur.role === 'formateur' && utilisateur.formateurId === session.formateurId
  if (!formateur && !estAdmin(utilisateur)) {
    const inscription = await trouverInscriptionLive(session.id, utilisateur.id)
    if (inscription?.statut !== 'confirmee') {
      throw createError({ statusCode: 403, statusMessage: 'Support réservé aux inscrits de la Live Session' })
    }
    if (session.statut !== 'terminee') {
      throw createError({ statusCode: 409, statusMessage: 'Le support sera disponible après la session.' })
    }
  }
  const support = await supportLive(session.id)
  if (!support) throw createError({ statusCode: 404, statusMessage: 'Aucun support pour cette session' })
  return { url: await urlSupportSignee(support.chemin, support.nom), nom: support.nom }
})
