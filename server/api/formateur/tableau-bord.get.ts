import { listerNotesFormateur, listerSujetsSession } from '../../database/coaching'
import {
  presenceMoyenne,
  revenusFormateur,
  sessionsFormateur,
  statistiquesModules,
} from '../../utils/formateur'
import { exigerFormateur } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const utilisateur = await exigerFormateur(event)
  const formateurId = utilisateur.formateurId!

  const [mesModules, sessions, notes, revenus] = await Promise.all([
    statistiquesModules(formateurId),
    sessionsFormateur(formateurId),
    listerNotesFormateur(formateurId),
    revenusFormateur(formateurId),
  ])

  const publies = mesModules.filter((m) => m.statut === 'disponible')
  const prochaine = sessions.find((s) => s.statut === 'planifiee') ?? null
  const sujets = prochaine ? await listerSujetsSession(prochaine.id) : []

  return {
    inscrits: publies.reduce((somme, m) => somme + m.inscrits, 0),
    nouveaux: publies.reduce((somme, m) => somme + m.nouveaux, 0),
    completionMoyenne: publies.length
      ? Math.round(publies.reduce((somme, m) => somme + m.completion, 0) / publies.length)
      : 0,
    nbModules: publies.length,
    // `null` tant qu'aucune présence n'a été relevée en séance.
    presenceMoyenne: presenceMoyenne(sessions),
    noteMoyenne: notes.length
      ? Math.round((notes.reduce((somme, n) => somme + n.note, 0) / notes.length) * 10) / 10
      : null,
    nbNotes: notes.length,
    remunerationDuMois: revenus.total.remuneration,
    prochaineSession: prochaine,
    // Sujets réellement soumis par les apprenants avant la prochaine session.
    sujets: sujets.map((s) => ({ apprenant: s.apprenant, sujet: s.preoccupation })),
    dernieresNotes: notes
      .slice(-3)
      .reverse()
      .map((n) => ({
        note: n.note,
        commentaire: n.commentaire ?? '',
        origine: `${n.origine === 'collective' ? 'session' : 'privé'} ${n.date}`,
      })),
  }
})
