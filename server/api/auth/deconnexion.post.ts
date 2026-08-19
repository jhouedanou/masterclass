import { fermerSession } from '../../utils/session'

export default defineEventHandler((event) => {
  fermerSession(event)
  return { ok: true }
})
