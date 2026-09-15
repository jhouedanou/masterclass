import { trouverUtilisateur } from '../../../database/comptes'
import { controlerCode, fournisseurCode } from '../../../utils/codeAdmin'
import { compterEchecAdmin, lireSessionPartielle, ouvrirSession } from '../../../utils/session'

/** Connexion admin, étape 2 : le code ouvre la session. */
export default defineEventHandler(async (event) => {
  const { code } = await readBody<{ code?: string }>(event)

  // Sous TOTP, la saisie peut aussi être un code de secours — des lettres et un
  // tiret. Ne garder que les chiffres l'effacerait.
  const totp = fournisseurCode() === 'totp'
  const saisie = totp ? (code ?? '').trim() : (code ?? '').replace(/\D/g, '')

  const utilisateurId = await lireSessionPartielle(event)
  if (!utilisateurId) {
    throw createError({ statusCode: 401, statusMessage: 'Recommencez la connexion : aucune vérification en cours.' })
  }
  if (!totp && saisie.length !== 6) {
    throw createError({ statusCode: 422, statusMessage: 'Saisissez les six chiffres du code.' })
  }
  if (totp && !saisie) {
    throw createError({ statusCode: 422, statusMessage: 'Saisissez le code de votre application.' })
  }

  const utilisateur = await trouverUtilisateur(utilisateurId)
  if (!utilisateur || (utilisateur.role !== 'admin-contenu' && utilisateur.role !== 'admin-superieur')) {
    throw createError({ statusCode: 403, statusMessage: 'Compte sans accès à l’administration.' })
  }

  const resultat = await controlerCode(utilisateur, saisie)
  if (resultat === 'expire') {
    throw createError({
      statusCode: 410,
      statusMessage: totp
        ? 'Aucune application enrôlée sur ce compte : recommencez la connexion.'
        : 'Code expiré : demandez-en un nouveau.',
    })
  }
  if (resultat === 'epuise') {
    throw createError({ statusCode: 429, statusMessage: 'Trop d’essais : demandez un nouveau code.' })
  }
  if (resultat === 'incorrect') {
    // Le plafond d'essais tenait à `codes_verification.tentatives`, qui n'existe
    // pas avec un TOTP : il est repris ici, dans la session d'attente.
    const { restants } = await compterEchecAdmin(event)
    throw createError({
      statusCode: 401,
      statusMessage: restants
        ? `Code incorrect : ${restants} essai${restants > 1 ? 's' : ''} restant${restants > 1 ? 's' : ''}.`
        : 'Trop d’essais : recommencez la connexion.',
    })
  }

  await ouvrirSession(event, utilisateur)
  return utilisateur
})
