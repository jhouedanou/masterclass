import { notesFormateurs, sujetsSessions } from '../../data/db'
import { revenusFormateur, sessionsFormateur, statistiquesModules } from '../../utils/formateur'
import { exigerFormateur } from '../../utils/session'

export default defineEventHandler((event) => {
  const utilisateur = exigerFormateur(event)
  const formateurId = utilisateur.formateurId!

  const mesModules = statistiquesModules(formateurId)
  const publies = mesModules.filter((m) => m.statut === 'disponible')
  const sessions = sessionsFormateur(formateurId)

  return {
    inscrits: publies.reduce((s, m) => s + m.inscrits, 0),
    nouveaux: publies.reduce((s, m) => s + m.nouveaux, 0),
    completionMoyenne: publies.length
      ? Math.round(publies.reduce((s, m) => s + m.completion, 0) / publies.length)
      : 0,
    nbModules: publies.length,
    presenceMoyenne: 82,
    noteMoyenne: (() => {
      const siennes = notesFormateurs.filter((n) => n.formateurId === formateurId)
      return siennes.length
        ? Math.round((siennes.reduce((s, n) => s + n.note, 0) / siennes.length) * 10) / 10
        : 0
    })(),
    nbNotes: notesFormateurs.filter((n) => n.formateurId === formateurId).length,
    remunerationDuMois: revenusFormateur(formateurId).total.remuneration,
    prochaineSession: sessions.find((s) => s.statut === 'planifiee') ?? null,
    // Sujets réellement soumis par les apprenants avant la prochaine session.
    sujets: sujetsSessions
      .filter((s) => s.sessionId === sessions.find((x) => x.statut === 'planifiee')?.id)
      .map((s) => ({ apprenant: s.apprenant, sujet: s.preoccupation })),
    dernieresNotes: notesFormateurs
      .filter((n) => n.formateurId === formateurId)
      .slice(-3)
      .reverse()
      .map((n) => ({
        note: n.note,
        commentaire: n.commentaire ?? '',
        origine: `${n.origine === 'collective' ? 'session' : 'privé'} ${n.date}`,
      })),
  }
})
