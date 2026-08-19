import { journal } from '../../data/db'
import { exigerAdmin } from '../../utils/session'

export default defineEventHandler((event) => {
  exigerAdmin(event)
  return journal
})
