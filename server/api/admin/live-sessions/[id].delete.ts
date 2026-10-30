import { enregistrerJournal } from '../../../database/administration'
import { listerInscriptionsSessionLive, supportLive, supprimerSessionLive, trouverSessionLive } from '../../../database/live'
import { effacerSupport } from '../../../utils/live'
import { exigerSection } from '../../../utils/session'

/**
 * Suppression d'une Live Session : interdite dès qu'une inscription est
 * confirmée (§11) — il faut alors l'annuler, pour prévenir les inscrits.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'live-sessions')
  const session = await trouverSessionLive(getRouterParam(event, 'id') ?? '')
  if (!session) throw createError({ statusCode: 404, statusMessage: 'Live Session introuvable' })
  const inscrits = await listerInscriptionsSessionLive(session.id, ['confirmee', 'a-rembourser'])
  if (inscrits.length) {
    throw createError({ statusCode: 409, statusMessage: 'Des inscriptions sont confirmées : annulez la session au lieu de la supprimer.' })
  }
  if (session.statut !== 'brouillon' && session.statut !== 'annulee') {
    throw createError({ statusCode: 409, statusMessage: 'Seul un brouillon ou une session annulée se supprime. Annulez d’abord la session.' })
  }
  const support = await supportLive(session.id)
  await supprimerSessionLive(session.id)
  await effacerSupport(support?.chemin)
  await enregistrerJournal(`${admin.prenom} ${admin.nom}`, 'a supprimé une Live Session', session.slug, { type: 'session', objet: 'live-session' })
  return { ok: true }
})
