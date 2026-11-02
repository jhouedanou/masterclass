import { enregistrerJournal } from '../../../database/administration'
import { trouverModule } from '../../../database/catalogue'
import {
  compterPlacesLive,
  majSessionLive,
  majZoomLive,
  liensZoomLive,
  reinitialiserRelancesLive,
  trouverSessionLive,
} from '../../../database/live'
import { envoyerChangementHoraireLive } from '../../../utils/emailsLive'
import { lireSaisieSessionLive } from '../../../utils/liveAdmin'
import { exigerSection } from '../../../utils/session'
import { modifierReunion } from '../../../utils/zoom'

/**
 * Édition d'une Live Session (planche 07). Un brouillon se modifie
 * librement. Une session publiée garde son module ; un nouvel horaire
 * remet les rappels à zéro, déplace la réunion Zoom et prévient les inscrits
 * (§4.1, T10). Après le début, seule la préparation se modifie.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'live-sessions')
  const session = await trouverSessionLive(getRouterParam(event, 'id') ?? '')
  if (!session) throw createError({ statusCode: 404, statusMessage: 'Live Session introuvable' })
  if (session.statut === 'annulee') throw createError({ statusCode: 409, statusMessage: 'Session annulée : elle ne se modifie plus' })

  const saisie = lireSaisieSessionLive(await readBody<Record<string, unknown>>(event))
  const colonnes: Record<string, unknown> = {}
  const demarree = session.statut === 'en-cours' || session.statut === 'terminee'

  if (saisie.moduleId && saisie.moduleId !== session.moduleId) {
    if (session.statut !== 'brouillon') {
      throw createError({ statusCode: 409, statusMessage: 'Le module d’une session publiée ne change plus : annulez-la et créez-en une autre.' })
    }
    const module = await trouverModule(saisie.moduleId)
    if (!module || module.statut === 'disponible') {
      throw createError({ statusCode: 422, statusMessage: 'Module introuvable ou déjà disponible en vidéo' })
    }
    colonnes.module_id = module.id
  }

  const horaireChange =
    (saisie.debut !== undefined && saisie.debut !== session.debut) ||
    (saisie.dureeMinutes !== undefined && saisie.dureeMinutes !== session.dureeMinutes)
  if (horaireChange) {
    if (demarree) throw createError({ statusCode: 409, statusMessage: 'La session a commencé : son horaire ne change plus' })
    if (saisie.debut && new Date(saisie.debut).getTime() <= Date.now()) {
      throw createError({ statusCode: 422, statusMessage: 'La nouvelle date doit être à venir' })
    }
    if (saisie.debut) colonnes.debut = saisie.debut
    if (saisie.dureeMinutes) colonnes.duree_minutes = saisie.dureeMinutes
  }

  if (saisie.capacite !== undefined && !demarree) {
    const places = (await compterPlacesLive([session.id])).get(session.id)
    if (saisie.capacite < (places?.confirmees ?? 0)) {
      throw createError({ statusCode: 422, statusMessage: `La capacité ne peut pas descendre sous les ${places?.confirmees} inscrits confirmés` })
    }
    colonnes.capacite = saisie.capacite
  }
  if (saisie.formateurId !== undefined && !demarree) colonnes.formateur_id = saisie.formateurId
  if (saisie.moderateurId !== undefined) colonnes.moderateur_id = saisie.moderateurId
  if (saisie.prerequis !== undefined) colonnes.prerequis = saisie.prerequis
  if (saisie.gains !== undefined) colonnes.gains = saisie.gains
  if (saisie.deroule !== undefined) colonnes.deroule = saisie.deroule
  if (saisie.derouleValide !== undefined) {
    colonnes.deroule_valide_le = saisie.derouleValide ? (session.derouleValideLe ?? new Date().toISOString()) : null
  }
  if (saisie.testTechniqueLe !== undefined) colonnes.test_technique_le = saisie.testTechniqueLe

  if (
    !demarree &&
    [saisie.zoomReunionId, saisie.zoomMotDePasse, saisie.zoomLienParticipation, saisie.zoomLienHote].some((v) => v !== undefined)
  ) {
    const actuels = await liensZoomLive(session.id)
    const zoom = {
      reunionId: saisie.zoomReunionId !== undefined ? saisie.zoomReunionId : actuels.reunionId,
      motDePasse: saisie.zoomMotDePasse !== undefined ? saisie.zoomMotDePasse : actuels.motDePasse,
      lienParticipation: saisie.zoomLienParticipation !== undefined ? saisie.zoomLienParticipation : actuels.lienParticipation,
      lienHote: saisie.zoomLienHote !== undefined ? saisie.zoomLienHote : actuels.lienHote,
    }
    if (session.statut === 'publiee' && !zoom.reunionId) {
      throw createError({ statusCode: 422, statusMessage: 'Une session publiée garde sa réunion Zoom' })
    }
    await majZoomLive(session.id, zoom)
  }

  const aJour = Object.keys(colonnes).length ? await majSessionLive(session.id, colonnes) : (await trouverSessionLive(session.id))!

  if (horaireChange && session.statut === 'publiee') {
    const { reunionId } = await liensZoomLive(session.id)
    if (reunionId) {
      await modifierReunion(reunionId, { debutIso: aJour.debut, dureeMinutes: aJour.dureeMinutes }).catch((e: Error) =>
        console.warn('[zoom] déplacement de la réunion', reunionId, e.message),
      )
    }
    await reinitialiserRelancesLive(session.id)
    await envoyerChangementHoraireLive(aJour, session.debut, session.dureeMinutes)
  }

  await enregistrerJournal(`${admin.prenom} ${admin.nom}`, horaireChange ? 'a changé l’horaire d’une Live Session' : 'a modifié une Live Session', aJour.slug, {
    type: 'session',
    objet: 'live-session',
    ...(horaireChange ? { diff: { avant: session.debut, apres: aJour.debut }, notification: 'E-mail aux inscrits' } : {}),
  })
  return aJour
})
