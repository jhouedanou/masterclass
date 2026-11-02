import { trouverFormateur, trouverModule } from '../../../database/catalogue'
import { trouverSessionLiveParSlug } from '../../../database/live'
import { icsLive } from '../../../utils/emailsLive'
import { exigerLiveVisible } from '../../../utils/live'

/** « Ajouter à mon agenda » (planches 04 et 06) : sans lien Zoom (RM4). */
export default defineEventHandler(async (event) => {
  await exigerLiveVisible(event)
  const session = await trouverSessionLiveParSlug(getRouterParam(event, 'slug') ?? '')
  if (!session || !['publiee', 'en-cours'].includes(session.statut)) {
    throw createError({ statusCode: 404, statusMessage: 'Live Session introuvable' })
  }
  const [module, formateur] = await Promise.all([trouverModule(session.moduleId), trouverFormateur(session.formateurId)])
  setResponseHeaders(event, {
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': `attachment; filename="live-session-${session.slug}.ics"`,
    'Cache-Control': 'no-store',
  })
  return icsLive(session, module?.titre ?? 'Live Session', formateur?.nom ?? '')
})
