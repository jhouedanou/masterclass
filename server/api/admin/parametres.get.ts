import { reglagesFinanciers, reglagesSeo } from '../../data/db'
import { exigerAdmin } from '../../utils/session'

export default defineEventHandler((event) => {
  const utilisateur = exigerAdmin(event)
  return { financiers: reglagesFinanciers, seo: reglagesSeo, role: utilisateur.role }
})
