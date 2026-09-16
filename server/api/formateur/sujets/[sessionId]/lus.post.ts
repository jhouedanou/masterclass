import { marquerSujetsLus, trouverSession } from '../../../../database/coaching'
import { exigerFormateur } from '../../../../utils/session'

/**
 * Marque les sujets d'une séance comme lus — le compteur « Sujets à lire » du
 * bloc « À traiter » retombe (planche D, écran 01).
 *
 * Le marquage se faisait dans le GET voisin. Un GET qui écrit se déclenche
 * depuis n'importe quel site tiers par simple navigation, le cookie de session
 * étant `sameSite: lax` : il suffisait d'un lien pour vider le compteur d'un
 * formateur à son insu. La page appelle cette route une fois la liste affichée.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerFormateur(event)
  const sessionId = getRouterParam(event, 'sessionId') ?? ''

  const session = await trouverSession(sessionId)
  if (!session) throw createError({ statusCode: 404, statusMessage: 'Session introuvable' })
  if (session.formateurId !== utilisateur.formateurId) {
    throw createError({ statusCode: 403, statusMessage: 'Cette session n’est pas la vôtre' })
  }

  await marquerSujetsLus(session.id)
  return { ok: true }
})
