import { lireReglagesFinanciers, lireReglagesSeo } from '../../database/administration'
import { exigerAdmin } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const utilisateur = await exigerAdmin(event)
  const [financiers, seo] = await Promise.all([lireReglagesFinanciers(), lireReglagesSeo()])
  return { financiers, seo, role: utilisateur.role }
})
