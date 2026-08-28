import { listerVersions } from '../../database/backoffice'
import { exigerSection } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await exigerSection(event, 'historique-versions')
  const { entite, entiteId } = getQuery(event) as Record<string, string | undefined>
  return await listerVersions(entite, entiteId)
})
