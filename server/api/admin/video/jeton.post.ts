import { trouverTeleversement } from '../../../database/video'
import { baseVideo, jetonEcriture } from '../../../utils/video'
import { exigerSection } from '../../../utils/session'

/**
 * Renouvellement du jeton de dépôt, sans rouvrir le téléversement.
 *
 * Un jeton vaut une heure ; sur un lien montant ouest-africain, sept cents
 * mégaoctets la dépassent volontiers. Sans ce renouvellement, il faudrait tout
 * reprendre à mi-parcours.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'modules-chapitres')
  const { uploadId } = await readBody<{ uploadId: string }>(event)

  const suivi = await trouverTeleversement(uploadId)
  if (!suivi) throw createError({ statusCode: 404, statusMessage: 'Téléversement introuvable' })
  if (suivi.statut !== 'en-cours') {
    throw createError({ statusCode: 409, statusMessage: 'Ce téléversement est clos.' })
  }

  const { requete, expiration } = await jetonEcriture('part', suivi.cle, uploadId, admin.id)
  return {
    urlPart: `${baseVideo()}/_televersement/part?${requete}`,
    expireLe: expiration,
  }
})
