import { listerSujetsSession } from '../../../database/coaching'
import { exigerFormateur } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  await exigerFormateur(event)
  const sessionId = getRouterParam(event, 'sessionId')
  return await listerSujetsSession(sessionId ?? '')
})
