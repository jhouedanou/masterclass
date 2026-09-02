import { enregistrerJournal } from '../../../database/administration'
import { marquerSupprime, trouverEmpreinte } from '../../../database/comptes'
import { verifierMotDePasse } from '../../../utils/motDePasse'
import { exigerUtilisateur, fermerSession } from '../../../utils/session'

/**
 * Parcours de suppression (planche B, écran 12) : mot de passe et confirmation
 * explicite, puis suppression douce et fermeture de la session. Réservé aux
 * apprenants — un formateur ou un administrateur passe par l'équipe.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const { motDePasse, confirmation } = await readBody<{ motDePasse?: string; confirmation?: string }>(event)

  if (utilisateur.role !== 'apprenant') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Ce compte est géré par l’équipe : contactez-la pour le fermer',
    })
  }
  if (confirmation !== 'SUPPRIMER') {
    throw createError({ statusCode: 422, statusMessage: 'Tapez SUPPRIMER pour confirmer' })
  }
  const valide = await verifierMotDePasse(motDePasse ?? '', await trouverEmpreinte(utilisateur.id))
  if (!valide) throw createError({ statusCode: 403, statusMessage: 'Mot de passe incorrect' })

  await marquerSupprime(utilisateur.id)
  await enregistrerJournal(`${utilisateur.prenom} ${utilisateur.nom}`, 'a supprimé son compte apprenant', utilisateur.id)
  await fermerSession(event)
  return { ok: true }
})
