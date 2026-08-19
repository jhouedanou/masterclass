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
    noteMoyenne: 4.8,
    nbNotes: 64,
    remunerationDuMois: revenusFormateur(formateurId).total.remuneration,
    prochaineSession: sessions.find((s) => s.statut === 'planifiee') ?? null,
    // Les sujets sont soumis par les apprenants avant chaque session.
    sujets: [
      { apprenant: 'Awa K.', sujet: 'Mes accroches sont vues mais ne génèrent presque aucun clic.' },
      {
        apprenant: 'Moussa D.',
        sujet: 'Adapter une même accroche à Instagram et LinkedIn sans la réécrire.',
      },
      {
        apprenant: 'Fatou B.',
        sujet: 'Faire relire 3 accroches pour ma marque de cosmétiques.',
      },
    ],
    dernieresNotes: [
      { note: 5, commentaire: 'Cas pratiques très concrets', origine: 'session 12/08' },
      { note: 4, commentaire: 'J’aurais aimé plus de temps', origine: 'privé 28/07' },
      { note: 5, commentaire: 'Retours précis sur mes accroches', origine: 'privé 20/07' },
    ],
  }
})
