import { enregistrerJournal } from '../../../../database/administration'
import { majModule, trouverModule } from '../../../../database/catalogue'
import { liensZoomLive, majZoomLive, transitionnerSessionLive, trouverSessionLive } from '../../../../database/live'
import { envoyerFormateurPlanifieeLive, prevenirAlertesLive } from '../../../../utils/emailsLive'
import { exigerSection } from '../../../../utils/session'
import { creerReunion } from '../../../../utils/zoom'

/**
 * « Publier la Live Session » (planche 07, §4.1 draft → published).
 *
 * Contrôles (T2) : date à venir, formateur, modérateur, réunion Zoom, module
 * pas encore disponible en vidéo. Chaque manque est nommé dans le refus. Sans
 * réunion saisie, elle est créée par l'API Zoom si l'admin l'a demandé
 * (`creerReunionZoom`), avec les réglages de session : sourdine à l'entrée,
 * pas de salle d'attente, enregistrement cloud.
 *
 * Effets : le module passe en « Live Session », la session apparaît chez le
 * formateur (e-mail « session planifiée ») et, sur demande, les apprenants
 * en alerte sur ce module sont prévenus.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'live-sessions')
  const { creerReunionZoom, prevenirAlertes } = await readBody<{ creerReunionZoom?: boolean; prevenirAlertes?: boolean }>(event) ?? {}
  const session = await trouverSessionLive(getRouterParam(event, 'id') ?? '')
  if (!session) throw createError({ statusCode: 404, statusMessage: 'Live Session introuvable' })
  if (session.statut !== 'brouillon') throw createError({ statusCode: 409, statusMessage: 'Seul un brouillon se publie' })
  const module = await trouverModule(session.moduleId)
  const zoom = await liensZoomLive(session.id)

  const manques: string[] = []
  if (new Date(session.debut).getTime() <= Date.now()) manques.push('une date à venir')
  if (!session.formateurId) manques.push('un formateur')
  if (!session.moderateurId) manques.push('un modérateur')
  if (!zoom.reunionId && !creerReunionZoom) manques.push('la réunion Zoom (ID à saisir, ou création automatique)')
  if (!module) manques.push('le module')
  else if (module.statut === 'disponible') manques.push('un module pas encore disponible en vidéo')
  if (manques.length) {
    throw createError({ statusCode: 422, statusMessage: `Publication impossible : il manque ${manques.join(', ')}.` })
  }

  if (!zoom.reunionId) {
    const reunion = await creerReunion({
      sujet: `Live Session — ${module!.titre}`,
      debutIso: session.debut,
      dureeMinutes: session.dureeMinutes,
      live: true,
    })
    await majZoomLive(session.id, {
      reunionId: reunion.id,
      motDePasse: reunion.motDePasse,
      lienParticipation: reunion.lienParticipation,
      lienHote: reunion.lienHote,
    })
  }

  if (!(await transitionnerSessionLive(session.id, ['brouillon'], 'publiee', { publiee_le: new Date().toISOString() }))) {
    throw createError({ statusCode: 409, statusMessage: 'La session a changé entre-temps : rechargez la page.' })
  }
  await majModule(module!.id, { statut: 'live-session' })
  const publiee = (await trouverSessionLive(session.id))!
  await envoyerFormateurPlanifieeLive(publiee)
  const prevenus = prevenirAlertes ? await prevenirAlertesLive(publiee) : 0

  await enregistrerJournal(`${admin.prenom} ${admin.nom}`, 'a publié une Live Session', `${module!.titre} — ${publiee.slug}`, {
    type: 'session',
    objet: 'live-session',
    notification: prevenus ? `${prevenus} apprenant(s) en alerte prévenu(s)` : undefined,
  })
  return { session: publiee, prevenus }
})
