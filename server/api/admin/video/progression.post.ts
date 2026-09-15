import { noterParts, trouverTeleversement } from '../../../database/video'
import { exigerSection } from '../../../utils/session'

/**
 * Miroir serveur des étiquettes de parts.
 *
 * Le navigateur en garde une copie, mais elle ne survit ni à un vidage de
 * cache, ni à un changement de poste. Et le stockage d'objets, vu d'un Worker,
 * ne sait pas relister les parts d'un dépôt en cours : perdues, elles sont
 * irrécupérables. D'où ce relevé, posé toutes les quelques parts.
 */
export default defineEventHandler(async (event) => {
  await exigerSection(event, 'modules-chapitres')
  const { uploadId, parts } = await readBody<{
    uploadId: string
    parts: { n: number; etag: string }[]
  }>(event)

  const suivi = await trouverTeleversement(uploadId)
  if (!suivi) throw createError({ statusCode: 404, statusMessage: 'Téléversement introuvable' })
  if (suivi.statut !== 'en-cours') {
    throw createError({ statusCode: 409, statusMessage: 'Ce téléversement est clos.' })
  }
  if (!Array.isArray(parts) || parts.some((p) => !p.etag || p.n < 1 || p.n > suivi.nbParts)) {
    throw createError({ statusCode: 422, statusMessage: 'Liste de parts invalide' })
  }

  await noterParts(uploadId, parts)
  setResponseStatus(event, 204)
  return null
})
