import { listerFormateurs, listerModules } from '../../database/catalogue'
import { compterPlacesLive, listerSessionsLive } from '../../database/live'
import { etatInscriptions, liveVisiblePour, sessionLivePublique, visibiliteLive } from '../../utils/live'
import { lireSession } from '../../utils/session'

/**
 * Sessions publiées à venir (CDC §5.2, §8), triées par date : page Live
 * Sessions, accueil, cartes module. Ni champ Zoom, ni support, ni nombre
 * d'inscrits (RM4, RM13) : seulement « complet » ou non. Fonctionnalité
 * masquée pour ce visiteur (10.G) : liste vide, l'accueil n'affiche rien.
 */
export default defineEventHandler(async (event) => {
  const [visibilite, utilisateur] = await Promise.all([visibiliteLive(), lireSession(event)])
  if (!liveVisiblePour(visibilite, utilisateur)) return []
  const maintenant = Date.now()
  const [sessions, modules, formateurs] = await Promise.all([
    listerSessionsLive({ statuts: ['publiee'] }),
    listerModules(),
    listerFormateurs(),
  ])
  const aVenir = sessions.filter((s) => new Date(s.debut).getTime() > maintenant)
  const places = await compterPlacesLive(aVenir.map((s) => s.id))
  const parModule = new Map(modules.map((m) => [m.id, m]))
  const parFormateur = new Map(formateurs.map((f) => [f.id, f]))

  return aVenir.flatMap((session) => {
    const module = parModule.get(session.moduleId)
    if (!module) return []
    const prises = places.get(session.id)
    const etat = etatInscriptions(session, (prises?.confirmees ?? 0) + (prises?.reservees ?? 0), maintenant)
    return [{
      ...sessionLivePublique(session, module, parFormateur.get(session.formateurId) ?? null),
      inscriptionsOuvertes: etat.ouvertes,
      complet: etat.complet,
    }]
  })
})
