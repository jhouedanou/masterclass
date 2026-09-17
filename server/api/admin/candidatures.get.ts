import { listerCandidatures } from '../../database/administration'
import { exigerUneSection } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await exigerUneSection(event, ['candidatures-formateurs', 'formateurs'])
  return await listerCandidatures()
})
