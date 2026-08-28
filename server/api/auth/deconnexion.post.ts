import { fermerSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await fermerSession(event)
  return { ok: true }
})
