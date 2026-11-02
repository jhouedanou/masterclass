import { enregistrerJournal } from '../../../../database/administration'
import { majModule, trouverModule } from '../../../../database/catalogue'
import { majSessionLive, trouverSessionLive } from '../../../../database/live'
import { envoyerModuleDisponibleLive } from '../../../../utils/emailsLive'
import { exigerSection } from '../../../../utils/session'

/**
 * « Publier la vidéo » (§4.2) : sur une session terminée dont le module est
 * encore en Live Session, chapitres vidéo renseignés. Le module passe
 * « Disponible » : achat ouvert à tous, accès vidéo actif pour les inscrits
 * sans nouveau paiement (RM6), badge Live Session retiré partout (RM8),
 * e-mail « module disponible ». La session reste en base pour l'historique.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'live-sessions')
  const session = await trouverSessionLive(getRouterParam(event, 'id') ?? '')
  if (!session) throw createError({ statusCode: 404, statusMessage: 'Live Session introuvable' })
  if (session.statut !== 'terminee') {
    throw createError({ statusCode: 409, statusMessage: 'La vidéo se publie une fois la session terminée' })
  }
  const module = await trouverModule(session.moduleId)
  if (!module || module.statut !== 'live-session') {
    throw createError({ statusCode: 409, statusMessage: 'Le module n’est plus en Live Session' })
  }
  const sansVideo = module.chapitres.filter((c) => !c.videoCle)
  if (!module.chapitres.length || sansVideo.length) {
    throw createError({
      statusCode: 422,
      statusMessage: module.chapitres.length
        ? `Chapitres sans vidéo : ${sansVideo.map((c) => c.titre).join(', ')}. Renseignez-les dans l’éditeur du module.`
        : 'Le module n’a encore aucun chapitre vidéo. Renseignez-les dans l’éditeur du module.',
    })
  }

  await majModule(module.id, { statut: 'disponible' })
  const aJour = await majSessionLive(session.id, { video_publiee_le: new Date().toISOString() })
  const envoyes = await envoyerModuleDisponibleLive(aJour)
  await enregistrerJournal(`${admin.prenom} ${admin.nom}`, 'a publié la vidéo d’une Live Session', module.titre, {
    type: 'contenu',
    objet: 'module',
    notification: envoyes ? `E-mail « module disponible » à ${envoyes} inscrit(s)` : undefined,
  })
  return aJour
})
