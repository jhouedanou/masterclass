import { DELAIS_LIVE } from '#shared/utils/live'
import { trouverFormateur, trouverModule } from '../../../../database/catalogue'
import { trouverInscriptionLive, trouverSessionLive } from '../../../../database/live'
import { estAdmin, etatApprenant, exigerLiveVisible } from '../../../../utils/live'
import { exigerUtilisateur } from '../../../../utils/session'

/**
 * Salle d'une Live Session (option B, 10.G) : ce que la page affiche avant
 * d'entrer, compte à rebours compris. L'autorisation d'entrer, elle, passe par
 * `POST /api/zoom/signature`, qui refait tous les contrôles.
 */
export default defineEventHandler(async (event) => {
  await exigerLiveVisible(event)
  const utilisateur = await exigerUtilisateur(event)
  const session = await trouverSessionLive(getRouterParam(event, 'id') ?? '')
  if (!session || session.statut === 'brouillon') {
    throw createError({ statusCode: 404, statusMessage: 'Live Session introuvable' })
  }
  const hote = (utilisateur.role === 'formateur' && utilisateur.formateurId === session.formateurId) || estAdmin(utilisateur)
  if (!hote) {
    const inscription = await trouverInscriptionLive(session.id, utilisateur.id)
    if (inscription?.statut !== 'confirmee') {
      throw createError({ statusCode: 403, statusMessage: 'Cette salle est réservée aux inscrits de la Live Session' })
    }
  }
  const [module, formateur] = await Promise.all([trouverModule(session.moduleId), trouverFormateur(session.formateurId)])
  if (!module) throw createError({ statusCode: 404, statusMessage: 'Live Session introuvable' })
  const ouvertureMinutes = hote ? DELAIS_LIVE.animerMinutes : DELAIS_LIVE.salleApprenantMinutes
  const debut = new Date(session.debut).getTime()

  return {
    id: session.id,
    slug: session.slug,
    titre: module.titre,
    moduleSlug: module.slug,
    formateur: formateur?.nom ?? '',
    debut: session.debut,
    dureeMinutes: session.dureeMinutes,
    statut: session.statut,
    etat: etatApprenant(session, module),
    role: hote ? ('hote' as const) : ('participant' as const),
    ouverture: new Date(debut - ouvertureMinutes * 60_000).toISOString(),
    fermeture: new Date(debut + (session.dureeMinutes + 30) * 60_000).toISOString(),
    deroule: session.deroule,
  }
})
