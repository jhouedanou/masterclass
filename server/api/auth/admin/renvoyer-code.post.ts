import { trouverUtilisateur } from '../../../database/comptes'
import { emettreCode } from '../../../utils/codeAdmin'
import { lireSessionPartielle } from '../../../utils/session'

/** Renvoi du code : au plus un par minute, règle portée par le fournisseur
 *  (`codeAdmin.ts`) — de quoi couvrir un message perdu sans offrir un canal
 *  de harcèlement. */
export default defineEventHandler(async (event) => {
  const utilisateurId = await lireSessionPartielle(event)
  if (!utilisateurId) {
    throw createError({ statusCode: 401, statusMessage: 'Recommencez la connexion : aucune vérification en cours.' })
  }
  const compte = await trouverUtilisateur(utilisateurId)
  if (!compte) throw createError({ statusCode: 401, statusMessage: 'Compte introuvable.' })

  await emettreCode(compte)
  return { ok: true }
})
