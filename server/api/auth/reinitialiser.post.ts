import { consommerReinitialisation, definirMotDePasse, trouverUtilisateur } from '../../database/comptes'
import { hacherJeton, hacherMotDePasse, refusMotDePasse } from '../../utils/motDePasse'
import { ouvrirSession } from '../../utils/session'

/**
 * Pose un nouveau mot de passe à partir d'un lien de réinitialisation.
 *
 * Le jeton est consommé au passage : le lien ne sert qu'une fois, et cesse
 * d'être valable au bout de trente minutes. Le verrouillage éventuel du compte
 * est levé — c'est la porte de sortie prévue après cinq échecs.
 */
export default defineEventHandler(async (event) => {
  const { jeton, motDePasse } = await readBody<{ jeton?: string; motDePasse?: string }>(event)

  if (!jeton) {
    throw createError({ statusCode: 422, statusMessage: 'Lien de réinitialisation incomplet.' })
  }

  const refus = refusMotDePasse(motDePasse ?? '')
  if (refus) {
    throw createError({ statusCode: 422, statusMessage: refus })
  }

  const utilisateurId = await consommerReinitialisation(hacherJeton(jeton))
  if (!utilisateurId) {
    throw createError({
      statusCode: 410,
      statusMessage: 'Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau.',
    })
  }

  await definirMotDePasse(utilisateurId, await hacherMotDePasse(motDePasse!))

  const utilisateur = await trouverUtilisateur(utilisateurId)
  if (utilisateur) await ouvrirSession(event, utilisateur)
  return { ok: true }
})
