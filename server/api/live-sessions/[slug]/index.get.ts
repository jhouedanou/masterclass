import { listerModules, trouverFormateur } from '../../../database/catalogue'
import { estInscritLive, trouverLiveSessionParSlug } from '../../../database/live'
import { estDisponible, formateurPublic, modulePublic } from '../../../utils/public'
import { lireSession } from '../../../utils/session'
import { debutSession } from '../../../utils/zoom'

/** Fiche publique d'une Live Session ; `inscrit` pour le visiteur connecté. */
export default defineEventHandler(async (event) => {
  const live = await trouverLiveSessionParSlug(getRouterParam(event, 'slug') ?? '')
  if (!live || live.statut === 'brouillon') {
    throw createError({ statusCode: 404, statusMessage: 'Live Session introuvable' })
  }
  const [formateur, modules, utilisateur] = await Promise.all([
    trouverFormateur(live.formateurId),
    listerModules(),
    lireSession(event),
  ])
  const fin = debutSession(live.date, live.heure).getTime() + live.dureeMinutes * 60_000
  return {
    live,
    passee: live.statut === 'terminee' || fin < Date.now(),
    formateur: formateur ? formateurPublic(formateur) : null,
    // Pour aller plus loin : les modules du même formateur.
    modules: formateur
      ? modules.filter((m) => m.formateurId === formateur.id && estDisponible(m)).slice(0, 3).map(modulePublic)
      : [],
    inscrit: utilisateur ? await estInscritLive(live.id, utilisateur.id) : false,
    connecte: Boolean(utilisateur),
  }
})
