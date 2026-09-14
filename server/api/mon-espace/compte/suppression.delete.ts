import { enregistrerJournal } from '../../../database/administration'
import { annulerSuppression } from '../../../database/comptes'
import { notifierCompte } from '../../../utils/notifications'
import { exigerUtilisateur } from '../../../utils/session'

/** Écran « Bon retour » (planche B, écran 12, écran 4) : annule la suppression programmée. */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  if (!utilisateur.suppressionPrevueLe) return { ok: true, reactive: false }
  await annulerSuppression(utilisateur.id)
  await notifierCompte(utilisateur, 'compte-reactive', { prenom: utilisateur.prenom })
  await enregistrerJournal(
    `${utilisateur.prenom} ${utilisateur.nom}`,
    'a réactivé son compte apprenant',
    utilisateur.id,
    { type: 'compte', objet: 'apprenant' },
  )
  return { ok: true, reactive: true }
})
