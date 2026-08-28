import { listerCandidatures } from '../../database/administration'
import { exigerAdmin } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await exigerAdmin(event)
  return await listerCandidatures()
})
