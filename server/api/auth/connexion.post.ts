import { utilisateurs } from '../../data/db'
import { ouvrirSession } from '../../utils/session'

/**
 * Connexion de démonstration : seul l'e-mail est vérifié, aucun mot de passe
 * n'est contrôlé. À remplacer par une authentification réelle (hash + jeton).
 */
export default defineEventHandler(async (event) => {
  const { email } = await readBody<{ email?: string }>(event)
  const utilisateur = utilisateurs.find(
    (u) => u.email.toLowerCase() === (email ?? '').trim().toLowerCase(),
  )
  if (!utilisateur) {
    throw createError({ statusCode: 401, statusMessage: 'Identifiants inconnus' })
  }
  ouvrirSession(event, utilisateur)
  return utilisateur
})
