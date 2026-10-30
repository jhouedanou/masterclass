import { listerFormateurs, listerModules } from '../../../database/catalogue'
import { listerComptesAdmin } from '../../../database/comptes'
import { compterPlacesLive, trouverSessionLive } from '../../../database/live'
import { ligneAdminLive } from '../../../utils/liveAdmin'
import { exigerSection } from '../../../utils/session'

/** Une session pour le formulaire d'édition : réunion Zoom comprise (admins, 10.F). */
export default defineEventHandler(async (event) => {
  await exigerSection(event, 'live-sessions')
  const session = await trouverSessionLive(getRouterParam(event, 'id') ?? '')
  if (!session) throw createError({ statusCode: 404, statusMessage: 'Live Session introuvable' })
  const [modules, formateurs, admins, places] = await Promise.all([
    listerModules(),
    listerFormateurs(),
    listerComptesAdmin(),
    compterPlacesLive([session.id]),
  ])
  return await ligneAdminLive(session, {
    modules: new Map(modules.map((m) => [m.id, m])),
    formateurs: new Map(formateurs.map((f) => [f.id, f])),
    admins: new Map(admins.map((a) => [a.id, a])),
    places: places.get(session.id),
    avecZoom: true,
  })
})
