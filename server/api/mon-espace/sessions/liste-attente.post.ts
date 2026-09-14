import { inscrireListeAttente, trouverSession } from '../../../database/coaching'
import { exigerUtilisateur } from '../../../utils/session'

/** « Complet — liste d'attente » (planche B, écran 08, état 5). */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const { sessionId } = await readBody<{ sessionId?: string }>(event)
  const session = await trouverSession(sessionId ?? '')
  if (!session || session.statut === 'annulee') {
    throw createError({ statusCode: 404, statusMessage: 'Session introuvable' })
  }
  if (session.inscrits < session.places) {
    throw createError({ statusCode: 409, statusMessage: 'Des places sont disponibles : réservez directement.' })
  }
  await inscrireListeAttente(session.id, utilisateur.id)
  return { ok: true }
})
