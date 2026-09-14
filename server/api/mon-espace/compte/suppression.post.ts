import { enregistrerJournal } from '../../../database/administration'
import { DELAI_SUPPRESSION_JOURS, programmerSuppression, trouverEmpreinte } from '../../../database/comptes'
import { verifierMotDePasse } from '../../../utils/motDePasse'
import { notifierCompte } from '../../../utils/notifications'
import { exigerUtilisateur, fermerSession } from '../../../utils/session'

/**
 * Parcours de suppression (planche B, écran 12) : mot de passe et case
 * « Je comprends que la suppression est irréversible après 14 jours », puis
 * suppression programmée — le compte est désactivé, la suppression définitive
 * intervient quatorze jours plus tard (tâche `comptes:purger`), une
 * reconnexion avant cette date le réactive. Réservé aux apprenants — un
 * formateur ou un administrateur passe par l'équipe.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const { motDePasse, confirmation } = await readBody<{ motDePasse?: string; confirmation?: boolean | string }>(event)

  if (utilisateur.role !== 'apprenant') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Ce compte est géré par l’équipe : contactez-la pour le fermer',
    })
  }
  if (confirmation !== true && confirmation !== 'SUPPRIMER') {
    throw createError({ statusCode: 422, statusMessage: 'Confirmez que la suppression est irréversible après 14 jours' })
  }
  const valide = await verifierMotDePasse(motDePasse ?? '', await trouverEmpreinte(utilisateur.id))
  if (!valide) throw createError({ statusCode: 403, statusMessage: 'Mot de passe incorrect' })

  const date = await programmerSuppression(utilisateur.id)
  await notifierCompte(utilisateur, 'suppression-programmee', {
    prenom: utilisateur.prenom,
    date: new Date(date).toLocaleDateString('fr-FR'),
    jours: String(DELAI_SUPPRESSION_JOURS),
  })
  await enregistrerJournal(
    `${utilisateur.prenom} ${utilisateur.nom}`,
    'a programmé la suppression de son compte apprenant',
    utilisateur.id,
    { type: 'compte', objet: 'apprenant', notification: 'Notification envoyée ✓' },
  )
  await fermerSession(event)
  return { ok: true, suppressionPrevueLe: date, jours: DELAI_SUPPRESSION_JOURS }
})
