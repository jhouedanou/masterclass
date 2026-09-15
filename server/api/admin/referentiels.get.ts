import { listerReferentiels } from '../../database/referentiels'
import { exigerAdmin } from '../../utils/session'

/** L'administration voit aussi les entrées désactivées, pour les rouvrir. */
export default defineEventHandler(async (event) => {
  await exigerAdmin(event)
  return listerReferentiels()
})
