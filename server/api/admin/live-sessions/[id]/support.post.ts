import { enregistrerJournal } from '../../../../database/administration'
import { trouverSessionLive } from '../../../../database/live'
import { deposerSupportLive } from '../../../../utils/liveAdmin'
import { exigerSection } from '../../../../utils/session'

/** Dépôt du support par l'admin (RM5) : `preparer`, puis `confirmer`. */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'live-sessions')
  const session = await trouverSessionLive(getRouterParam(event, 'id') ?? '')
  if (!session) throw createError({ statusCode: 404, statusMessage: 'Live Session introuvable' })
  const corps = await readBody<{ etape?: string; nom?: string; taille?: number; chemin?: string }>(event)
  const resultat = await deposerSupportLive(session, corps)
  if (corps.etape === 'confirmer') {
    await enregistrerJournal(`${admin.prenom} ${admin.nom}`, 'a déposé le support d’une Live Session', session.slug, {
      type: 'session',
      objet: 'live-session',
    })
  }
  return resultat
})
