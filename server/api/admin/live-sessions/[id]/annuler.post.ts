import { enregistrerJournal } from '../../../../database/administration'
import { majModule, trouverModule } from '../../../../database/catalogue'
import { annulerReservationsSessionLive, transitionnerSessionLive, trouverSessionLive } from '../../../../database/live'
import { envoyerAnnulationLive } from '../../../../utils/emailsLive'
import { exigerSection } from '../../../../utils/session'

/**
 * « Annuler » (§4.1 draft | published → cancelled) : les inscrits sont
 * prévenus (remboursement ou report, traités hors plateforme), les
 * réservations en cours tombent et le module revient « À venir » (T10).
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'live-sessions')
  const session = await trouverSessionLive(getRouterParam(event, 'id') ?? '')
  if (!session) throw createError({ statusCode: 404, statusMessage: 'Live Session introuvable' })
  if (!(await transitionnerSessionLive(session.id, ['brouillon', 'publiee'], 'annulee', { annule_le: new Date().toISOString() }))) {
    throw createError({ statusCode: 409, statusMessage: 'Seule une session en brouillon ou publiée s’annule' })
  }
  await annulerReservationsSessionLive(session.id)
  const module = await trouverModule(session.moduleId)
  if (module?.statut === 'live-session') await majModule(module.id, { statut: 'annonce' })
  const annulee = (await trouverSessionLive(session.id))!
  const prevenus = session.statut === 'publiee' ? await envoyerAnnulationLive(annulee) : 0
  await enregistrerJournal(`${admin.prenom} ${admin.nom}`, 'a annulé une Live Session', annulee.slug, {
    type: 'session',
    objet: 'live-session',
    notification: prevenus ? `E-mail d’annulation à ${prevenus} inscrit(s)` : undefined,
  })
  return annulee
})
