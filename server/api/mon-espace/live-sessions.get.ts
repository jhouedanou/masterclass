import { listerLiveSessions, listerInscriptionsLiveUtilisateur } from '../../database/live'
import { exigerUtilisateur } from '../../utils/session'
import { debutSession, salleOuverte } from '../../utils/zoom'

/** Les Live Sessions où l'apprenant est inscrit, avec l'état de leur salle. */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const [ids, sessions] = await Promise.all([listerInscriptionsLiveUtilisateur(utilisateur.id), listerLiveSessions()])
  const siennes = new Set(ids)
  return sessions
    .filter((s) => siennes.has(s.id) && s.statut !== 'brouillon')
    .map((s) => {
      const debut = debutSession(s.date, s.heure)
      const { ouverte, fermeture } = salleOuverte(debut, s.dureeMinutes, 15)
      return { ...s, salleOuverte: ouverte && s.statut === 'publiee', passee: s.statut === 'terminee' || Date.now() > fermeture.getTime() }
    })
})
