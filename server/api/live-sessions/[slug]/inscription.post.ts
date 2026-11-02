import { trouverFormateur } from '../../../database/catalogue'
import { inscrireLive, liensZoomLive, trouverLiveSessionParSlug } from '../../../database/live'
import { notifier } from '../../../utils/notifications'
import { exigerUtilisateur } from '../../../utils/session'

/**
 * Inscription à une Live Session. Places, statut, date et gratuité sont
 * vérifiés par `inscrire_live_session`, sous verrou. L'e-mail de confirmation
 * porte l'accès à la salle et, en secours, le lien Zoom de participation.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const live = await trouverLiveSessionParSlug(getRouterParam(event, 'slug') ?? '')
  if (!live) throw createError({ statusCode: 404, statusMessage: 'Live Session introuvable' })

  const inscrits = await inscrireLive(live.id, utilisateur.id)

  const [formateur, liens] = await Promise.all([trouverFormateur(live.formateurId), liensZoomLive(live.id)])
  await notifier({
    canal: 'email',
    a: utilisateur.email,
    modele: 'live-inscription',
    variables: {
      prenom: utilisateur.prenom,
      titre: live.titre,
      date: live.date,
      heure: live.heure,
      formateur: formateur?.nom ?? '',
      salle: `/mon-espace/session/${live.id}`,
      lienZoom: liens.lienParticipation ?? '',
      ouvertureMinutes: '15',
    },
  })

  return { ok: true, inscrits, salle: `/mon-espace/session/${live.id}` }
})
