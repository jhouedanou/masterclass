import { enregistrerJournal } from '../../../database/administration'
import { liensZoomLive, majLiveSession, majZoomLive, trouverLiveSession } from '../../../database/live'
import { lireChampsLiveSession } from '../../../utils/liveSessions'
import { exigerSection } from '../../../utils/session'
import { creerReunion, debutSession, modifierReunion, supprimerReunion } from '../../../utils/zoom'

/**
 * Modification d'une Live Session. Date, heure, durée ou titre changés : la
 * réunion Zoom suit. Annulée : la réunion est supprimée, la salle refuse
 * l'entrée. Les inscrits ne sont pas prévenus automatiquement d'un report ou
 * d'une annulation : l'équipe s'en charge.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'calendrier-sessions')
  const id = getRouterParam(event, 'id') ?? ''
  const avant = await trouverLiveSession(id)
  if (!avant) throw createError({ statusCode: 404, statusMessage: 'Live Session introuvable' })

  const champs = lireChampsLiveSession(await readBody(event))
  if (champs.places < avant.inscrits) {
    throw createError({ statusCode: 422, statusMessage: `${avant.inscrits} personnes sont déjà inscrites : les places ne peuvent pas descendre en dessous.` })
  }
  const live = await majLiveSession(id, champs)

  const liens = await liensZoomLive(id)
  const debutIso = debutSession(live.date, live.heure).toISOString()
  if (live.statut === 'annulee') {
    if (liens.reunionId) await supprimerReunion(liens.reunionId)
  } else if (!liens.reunionId || avant.statut === 'annulee') {
    // Réunion supprimée à l'annulation, ou jamais créée : on en refait une.
    await majZoomLive(id, await creerReunion({ sujet: `Live Session — ${live.titre}`, debutIso, dureeMinutes: live.dureeMinutes }))
  } else if (
    avant.date !== live.date || avant.heure !== live.heure || avant.dureeMinutes !== live.dureeMinutes || avant.titre !== live.titre
  ) {
    await modifierReunion(liens.reunionId, { debutIso, dureeMinutes: live.dureeMinutes, sujet: `Live Session — ${live.titre}` })
  }

  await enregistrerJournal(`${admin.prenom} ${admin.nom}`, 'a modifié une Live Session', `${live.titre} (${live.statut})`)
  return live
})
