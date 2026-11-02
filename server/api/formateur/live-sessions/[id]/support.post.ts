import { enregistrerJournal } from '../../../../database/administration'
import { trouverSessionLive } from '../../../../database/live'
import { exigerLiveVisible } from '../../../../utils/live'
import { deposerSupportLive } from '../../../../utils/liveAdmin'
import { exigerFormateur } from '../../../../utils/session'

/**
 * Dépôt du support par le formateur, sur ses propres sessions (RM5, RM12) :
 * `preparer` rend l'URL d'envoi direct, `confirmer` l'enregistre.
 */
export default defineEventHandler(async (event) => {
  await exigerLiveVisible(event)
  const utilisateur = await exigerFormateur(event)
  const session = await trouverSessionLive(getRouterParam(event, 'id') ?? '')
  if (!session || session.formateurId !== utilisateur.formateurId || session.statut === 'brouillon') {
    throw createError({ statusCode: 404, statusMessage: 'Live Session introuvable' })
  }
  const corps = await readBody<{ etape?: string; nom?: string; taille?: number; chemin?: string }>(event)
  const resultat = await deposerSupportLive(session, corps)
  if (corps.etape === 'confirmer') {
    await enregistrerJournal(`${utilisateur.prenom} ${utilisateur.nom}`, 'a déposé le support d’une Live Session', session.slug, {
      type: 'session',
      objet: 'live-session',
    })
  }
  return resultat
})
