import {
  acces,
  formateurs,
  inscriptionsSessions,
  modules,
  sessionsCoaching,
  thematiques,
} from '../../../data/db'
import { exigerUtilisateur } from '../../../utils/session'

/** Sessions visibles : uniquement celles dont l'apprenant possède un module couvert. */
export default defineEventHandler((event) => {
  const utilisateur = exigerUtilisateur(event)
  const siens = acces.filter((a) => a.utilisateurId === utilisateur.id).map((a) => a.moduleId)

  return sessionsCoaching
    .filter((s) => {
      const couverts = modules.filter((m) => m.thematiqueId === s.thematiqueId).map((m) => m.id)
      return couverts.some((id) => siens.includes(id))
    })
    .map((s) => ({
      ...s,
      thematique: thematiques.find((t) => t.id === s.thematiqueId) ?? null,
      formateur: formateurs.find((f) => f.id === s.formateurId) ?? null,
      inscrit: inscriptionsSessions.some(
        (i) => i.sessionId === s.id && i.utilisateurId === utilisateur.id,
      ),
      ficheRequise: utilisateur.ficheCompletee !== true,
    }))
})
