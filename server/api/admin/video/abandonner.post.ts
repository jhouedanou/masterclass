import { cloreTeleversement, trouverTeleversement } from '../../../database/video'
import { abandonnerDepot } from '../../../utils/video'
import { exigerSection } from '../../../utils/session'

/**
 * Abandon d'un dépôt. Rejouable à dessein : on ferme l'onglet, on revient, on
 * renonce — et les parts déjà poussées sont facturées tant qu'elles n'ont pas
 * été explicitement abandonnées.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'modules-chapitres')
  const { uploadId } = await readBody<{ uploadId: string }>(event)

  const suivi = await trouverTeleversement(uploadId)
  if (suivi && suivi.statut === 'en-cours') {
    await abandonnerDepot(suivi.cle, uploadId, admin.id)
    await cloreTeleversement(uploadId, 'abandonne')
  }

  setResponseStatus(event, 204)
  return null
})
