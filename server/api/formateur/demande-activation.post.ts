import { enregistrerJournal } from '../../database/administration'
import { demanderActivationCoachingPrive, trouverFormateur } from '../../database/catalogue'
import { ORGANISATION } from '#shared/utils/contact'
import { notifier } from '../../utils/notifications'
import { exigerFormateur } from '../../utils/session'

/**
 * « Demander l'activation à l'équipe » (planche D, écran 05, état verrouillé).
 *
 * Le formateur ne s'active pas lui-même : la demande est horodatée sur sa
 * fiche, portée au journal et notifiée à l'équipe, qui pose l'accès depuis
 * l'écran 07b du back-office.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerFormateur(event)
  const formateurId = utilisateur.formateurId!

  const formateur = await trouverFormateur(formateurId)
  if (!formateur) throw createError({ statusCode: 404, statusMessage: 'Profil introuvable' })
  if (formateur.coachingPriveActif) {
    throw createError({ statusCode: 409, statusMessage: 'Le coaching privé est déjà activé sur votre compte' })
  }

  const majee = await demanderActivationCoachingPrive(formateurId)

  await enregistrerJournal(formateur.nom, 'a demandé l’activation du coaching privé', formateur.id, {
    type: 'formateur',
    objet: 'acces',
    notification: 'Notification envoyée ✓',
  })

  await notifier({
    canal: 'email',
    a: ORGANISATION.email,
    modele: 'activation-coaching-demandee',
    variables: { formateur: formateur.nom, id: formateur.id },
  })

  return majee
})
