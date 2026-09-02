import {
  changerStatutDemandeCoachingPrive,
  trouverDemandeCoachingPrive,
} from '../../../../database/coaching'
import { exigerUtilisateur } from '../../../../utils/session'

/** L'apprenant peut retirer sa demande tant qu'elle n'est pas payée. */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const id = getRouterParam(event, 'id') ?? ''

  const demande = await trouverDemandeCoachingPrive(id)
  if (!demande || demande.utilisateurId !== utilisateur.id) {
    throw createError({ statusCode: 404, statusMessage: 'Demande introuvable' })
  }
  if (demande.statut !== 'en-attente' && demande.statut !== 'confirmee-attente-paiement') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Une demande payée ou close ne peut plus être annulée — contactez l’équipe',
    })
  }

  return await changerStatutDemandeCoachingPrive(id, {
    statut: 'annulee',
    auteur: `${utilisateur.prenom} ${utilisateur.nom}`,
    commentaire: 'Demande retirée par l’apprenant.',
  })
})
