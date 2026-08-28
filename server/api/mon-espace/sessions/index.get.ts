import { listerFormateurs, listerModules, listerThematiques } from '../../../database/catalogue'
import { listerInscriptionsUtilisateur, listerSessions } from '../../../database/coaching'
import { listerAccesUtilisateur } from '../../../database/comptes'
import { exigerUtilisateur } from '../../../utils/session'

/** Sessions visibles : uniquement celles dont l'apprenant possède un module couvert. */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)

  const [acces, sessions, modules, thematiques, formateurs, inscriptions] = await Promise.all([
    listerAccesUtilisateur(utilisateur.id),
    listerSessions(),
    listerModules(),
    listerThematiques(),
    listerFormateurs(),
    listerInscriptionsUtilisateur(utilisateur.id),
  ])

  const siens = new Set(acces.map((a) => a.moduleId))
  const inscrit = new Set(inscriptions.map((i) => i.sessionId))

  return sessions
    .filter((s) =>
      modules.some((m) => m.thematiqueId === s.thematiqueId && siens.has(m.id)),
    )
    .map((s) => ({
      ...s,
      thematique: thematiques.find((t) => t.id === s.thematiqueId) ?? null,
      formateur: formateurs.find((f) => f.id === s.formateurId) ?? null,
      inscrit: inscrit.has(s.id),
      ficheRequise: utilisateur.ficheCompletee !== true,
    }))
})
