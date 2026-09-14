import { changerStatutDemandeCoachingPrive, trouverDemandeCoachingPrive } from '../../../database/coaching'
import { trouverFormateur } from '../../../database/catalogue'
import { exigerUtilisateur } from '../../../utils/session'
import { notifier } from '../../../utils/notifications'
import { listerUtilisateurs } from '../../../database/comptes'

/**
 * « Confirmez vos sujets avant d'entrer » (planche B, écran 08b, coaching
 * privé) : étape obligatoire avant la salle. Les sujets sont tracés dans le
 * suivi de la demande et transmis instantanément au formateur.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const { demandeId, preoccupation, attente } = await readBody<{ demandeId?: string; preoccupation?: string; attente?: string }>(event)
  const sujets = (preoccupation ?? '').trim()
  if (!sujets) throw createError({ statusCode: 422, statusMessage: 'Les sujets à traiter sont obligatoires' })

  const demande = await trouverDemandeCoachingPrive(demandeId ?? '')
  if (!demande || demande.utilisateurId !== utilisateur.id) {
    throw createError({ statusCode: 404, statusMessage: 'Séance introuvable' })
  }
  if (demande.statut !== 'payee') {
    throw createError({ statusCode: 409, statusMessage: 'La séance n’est pas confirmée' })
  }

  await changerStatutDemandeCoachingPrive(demande.id, {
    statut: 'payee',
    auteur: `${utilisateur.prenom} ${utilisateur.nom}`,
    commentaire: `Sujets confirmés avant la séance : ${sujets}${attente?.trim() ? ` — Documents : ${attente.trim()}` : ''}`,
  })

  // Le formateur reçoit les sujets aussitôt, sur le compte rattaché à sa fiche.
  const formateur = await trouverFormateur(demande.formateurId)
  const compte = (await listerUtilisateurs()).find((u) => u.formateurId === demande.formateurId)
  if (compte) {
    await notifier({
      canal: 'email',
      a: compte.email,
      modele: 'coaching-prive-statut',
      variables: { prenom: compte.prenom, statut: 'sujets', sujets, apprenant: demande.apprenant, formateur: formateur?.nom ?? '' },
    })
  }
  return { ok: true }
})
