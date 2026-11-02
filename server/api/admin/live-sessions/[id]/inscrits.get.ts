import { listerInscriptionsLiveDetaillees } from '../../../../utils/liveInscrits'
import { exigerSection } from '../../../../utils/session'

/** Inscrits confirmés et à rembourser d'une session (admins seulement, RM13). */
export default defineEventHandler(async (event) => {
  await exigerSection(event, 'live-sessions')
  return await listerInscriptionsLiveDetaillees(getRouterParam(event, 'id') ?? '')
})
