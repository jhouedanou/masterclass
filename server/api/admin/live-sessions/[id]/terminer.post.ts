import { enregistrerJournal } from '../../../../database/administration'
import { transitionnerSessionLive, trouverSessionLive } from '../../../../database/live'
import { envoyerFinLive } from '../../../../utils/emailsLive'
import { exigerSection } from '../../../../utils/session'

/**
 * « Marquer comme terminée » (§4.1 live → ended) : quiz ouvert aux inscrits,
 * support visible s'il est déposé, coaching ouvert. L'e-mail de fin part si
 * le support est là, sinon à son dépôt. Sans action de l'admin, le job s'en
 * charge au début + durée + 60 min.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'live-sessions')
  const session = await trouverSessionLive(getRouterParam(event, 'id') ?? '')
  if (!session) throw createError({ statusCode: 404, statusMessage: 'Live Session introuvable' })
  if (session.statut === 'publiee' && new Date(session.debut).getTime() > Date.now()) {
    throw createError({ statusCode: 409, statusMessage: 'La session n’a pas encore commencé' })
  }
  const termineLe = new Date().toISOString()
  if (!(await transitionnerSessionLive(session.id, ['publiee', 'en-cours'], 'terminee', { termine_le: termineLe }))) {
    throw createError({ statusCode: 409, statusMessage: 'Seule une session en cours se termine' })
  }
  const terminee = (await trouverSessionLive(session.id))!
  const envoyes = await envoyerFinLive(terminee)
  await enregistrerJournal(`${admin.prenom} ${admin.nom}`, 'a marqué terminée une Live Session', terminee.slug, {
    type: 'session',
    objet: 'live-session',
    notification: envoyes ? `E-mail de fin à ${envoyes} inscrit(s)` : undefined,
  })
  return terminee
})
