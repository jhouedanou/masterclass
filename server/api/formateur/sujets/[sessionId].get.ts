import { sujetsSessions } from '../../../data/db'
import { exigerFormateur } from '../../../utils/session'

export default defineEventHandler((event) => {
  exigerFormateur(event)
  const sessionId = getRouterParam(event, 'sessionId')
  return sujetsSessions.filter((s) => s.sessionId === sessionId)
})
