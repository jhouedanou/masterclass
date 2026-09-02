import { trouverUtilisateur } from '../../../database/comptes'
import { controlerCode } from '../../../utils/codeAdmin'
import { lireSessionPartielle, ouvrirSession } from '../../../utils/session'

/** Connexion admin, étape 2 : le code ouvre la session. */
export default defineEventHandler(async (event) => {
  const { code } = await readBody<{ code?: string }>(event)
  const saisie = (code ?? '').replace(/\D/g, '')

  const utilisateurId = await lireSessionPartielle(event)
  if (!utilisateurId) {
    throw createError({ statusCode: 401, statusMessage: 'Recommencez la connexion : aucune vérification en cours.' })
  }
  if (saisie.length !== 6) {
    throw createError({ statusCode: 422, statusMessage: 'Saisissez les six chiffres du code.' })
  }

  const utilisateur = await trouverUtilisateur(utilisateurId)
  if (!utilisateur || (utilisateur.role !== 'admin-contenu' && utilisateur.role !== 'admin-superieur')) {
    throw createError({ statusCode: 403, statusMessage: 'Compte sans accès à l’administration.' })
  }

  const resultat = await controlerCode(utilisateur, saisie)
  if (resultat === 'expire') {
    throw createError({ statusCode: 410, statusMessage: 'Code expiré : demandez-en un nouveau.' })
  }
  if (resultat === 'epuise') {
    throw createError({ statusCode: 429, statusMessage: 'Trop d’essais : demandez un nouveau code.' })
  }
  if (resultat === 'incorrect') {
    throw createError({ statusCode: 401, statusMessage: 'Code incorrect ou expiré.' })
  }

  await ouvrirSession(event, utilisateur)
  return utilisateur
})
