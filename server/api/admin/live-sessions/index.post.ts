import { enregistrerJournal } from '../../../database/administration'
import { trouverFormateur } from '../../../database/catalogue'
import { creerLiveSession } from '../../../database/live'
import { lireChampsLiveSession } from '../../../utils/liveSessions'
import { exigerSection } from '../../../utils/session'
import { creerReunion, debutSession } from '../../../utils/zoom'

/** Création d'une Live Session ; la réunion Zoom est créée dans la foulée. */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'calendrier-sessions')
  const champs = lireChampsLiveSession(await readBody(event))
  const formateur = await trouverFormateur(champs.formateurId)
  if (!formateur) throw createError({ statusCode: 404, statusMessage: 'Formateur introuvable' })

  const zoom = await creerReunion({
    sujet: `Live Session — ${champs.titre}`,
    debutIso: debutSession(champs.date, champs.heure).toISOString(),
    dureeMinutes: champs.dureeMinutes,
  })
  const live = await creerLiveSession(champs, zoom)

  await enregistrerJournal(
    `${admin.prenom} ${admin.nom}`,
    'a créé une Live Session',
    `${live.titre} — ${formateur.nom}, ${live.date} ${live.heure}`,
  )
  return live
})
