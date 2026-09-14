import { listerFormateurs, listerModules, listerThematiques } from '../../../database/catalogue'
import {
  listerInscriptionsUtilisateur,
  listerListeAttenteUtilisateur,
  listerSessions,
} from '../../../database/coaching'
import { completionProfil, listerAccesUtilisateur } from '../../../database/comptes'
import { exigerUtilisateur } from '../../../utils/session'
import { debutSession, salleOuverte } from '../../../utils/zoom'

/** Les six états du bouton d'une session (planche B, écran 08). */
export type EtatSessionApprenant =
  | 'verrou-profil'
  | 'reserver'
  | 'inscrit'
  | 'rejoindre'
  | 'complet-attente'
  | 'reportee'
  | 'annulee'
  | 'passee'

/** Sessions visibles : uniquement celles dont l'apprenant possède un module couvert. */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)

  const [acces, sessions, modules, thematiques, formateurs, inscriptions, attente, completion] = await Promise.all([
    listerAccesUtilisateur(utilisateur.id),
    listerSessions(),
    listerModules(),
    listerThematiques(),
    listerFormateurs(),
    listerInscriptionsUtilisateur(utilisateur.id),
    listerListeAttenteUtilisateur(utilisateur.id),
    completionProfil(utilisateur),
  ])

  const siens = new Set(acces.filter((a) => !a.revoqueLe).map((a) => a.moduleId))
  const inscrit = new Map(inscriptions.map((i) => [i.sessionId, i]))
  const enAttente = new Set(attente)
  const maintenant = new Date()
  const aujourdHui = maintenant.toISOString().slice(0, 10)

  return sessions
    .filter((s) => modules.some((m) => m.thematiqueId === s.thematiqueId && siens.has(m.id)))
    .map((s) => {
      const inscription = inscrit.get(s.id)
      const debut = debutSession(s.date, s.heure)
      const fin = new Date(debut.getTime() + s.dureeMinutes * 60_000)
      const { ouverte, ouverture } = salleOuverte(debut, s.dureeMinutes, s.ouvertureSalleMinutes, maintenant)
      const passee = s.statut === 'terminee' || fin < maintenant

      let etat: EtatSessionApprenant
      if (s.statut === 'annulee') etat = 'annulee'
      else if (passee) etat = 'passee'
      else if (inscription) etat = ouverte ? 'rejoindre' : 'inscrit'
      else if (s.reporteeDe) etat = 'reportee'
      else if (completion < 100) etat = 'verrou-profil'
      else if (s.inscrits >= s.places) etat = 'complet-attente'
      else etat = 'reserver'

      return {
        ...s,
        thematique: thematiques.find((t) => t.id === s.thematiqueId) ?? null,
        formateur: formateurs.find((f) => f.id === s.formateurId) ?? null,
        inscrit: Boolean(inscription),
        present: inscription?.present ?? null,
        enListeAttente: enAttente.has(s.id),
        ficheRequise: completion < 100,
        completionProfil: completion,
        etat,
        passee,
        /** Instant d'ouverture de la salle (H-15 min), pour le libellé du bouton. */
        ouvertureSalle: ouverture.toISOString(),
        heureFin: fin.toISOString().slice(11, 16),
        aujourdHui: s.date === aujourdHui,
      }
    })
})
