import { listerFormateurs, listerModules, listerProgrammes } from '../../../database/catalogue'
import { listerComptesAdmin } from '../../../database/comptes'
import { compterPlacesLive, listerSessionsLive } from '../../../database/live'
import { visibiliteLive } from '../../../utils/live'
import { ligneAdminLive } from '../../../utils/liveAdmin'
import { exigerSection } from '../../../utils/session'

/**
 * Back-office Live Sessions (planche 07, CDC §5.2) : liste (statut, date,
 * inscrits / capacité, échéance de la vidéo), réglage de visibilité, et ce
 * qu'il faut au formulaire : modules éligibles (pas encore disponibles en
 * vidéo, sans session active), formateurs, modérateurs (admins, 10.F).
 */
export default defineEventHandler(async (event) => {
  await exigerSection(event, 'live-sessions')
  const [sessions, modules, formateurs, admins, programmes, visibilite] = await Promise.all([
    listerSessionsLive(),
    listerModules(),
    listerFormateurs(),
    listerComptesAdmin(),
    listerProgrammes(),
    visibiliteLive(),
  ])
  const places = await compterPlacesLive(sessions.map((s) => s.id))
  const contexte = {
    modules: new Map(modules.map((m) => [m.id, m])),
    formateurs: new Map(formateurs.map((f) => [f.id, f])),
    admins: new Map(admins.map((a) => [a.id, a])),
  }
  const lignes = await Promise.all(
    sessions.map((s) => ligneAdminLive(s, { ...contexte, places: places.get(s.id) })),
  )
  const actives = new Set(
    sessions.filter((s) => ['brouillon', 'publiee', 'en-cours'].includes(s.statut)).map((s) => s.moduleId),
  )

  return {
    visibilite,
    // Les plus proches d'abord, les terminées et annulées ensuite.
    sessions: lignes.sort((a, b) => {
      const rang = (s: typeof a) => (['brouillon', 'publiee', 'en-cours'].includes(s.statut) ? 0 : s.statut === 'terminee' ? 1 : 2)
      return rang(a) - rang(b) || (rang(a) === 0 ? a.debut.localeCompare(b.debut) : b.debut.localeCompare(a.debut))
    }),
    modules: modules
      .filter((m) => m.statut !== 'disponible' && m.statut !== 'brouillon')
      .map((m) => ({
        id: m.id,
        titre: m.titre,
        numero: m.numero,
        programme: m.programme,
        programmeNom: programmes.find((p) => p.slug === m.programme)?.nom ?? m.programme,
        statut: m.statut,
        formateurId: m.formateurId,
        prerequis: m.prerequis,
        acquis: m.acquis,
        sessionActive: actives.has(m.id),
      })),
    formateurs: formateurs.map((f) => ({ id: f.id, nom: f.nom })),
    moderateurs: admins
      .filter((a) => a.role === 'admin-contenu' || a.role === 'admin-superieur')
      .map((a) => ({ id: a.id, nom: `${a.prenom} ${a.nom}` })),
  }
})
