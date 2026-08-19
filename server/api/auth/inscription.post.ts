import { utilisateurs } from '../../data/db'
import { ouvrirSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ prenom?: string; nom?: string; email?: string }>(event)
  const email = (body.email ?? '').trim().toLowerCase()
  if (!email || !body.prenom || !body.nom) {
    throw createError({ statusCode: 422, statusMessage: 'Prénom, nom et e-mail sont requis' })
  }
  if (utilisateurs.some((u) => u.email.toLowerCase() === email)) {
    throw createError({ statusCode: 409, statusMessage: 'Un compte existe déjà avec cet e-mail' })
  }
  const utilisateur = {
    id: `usr-${Math.random().toString(36).slice(2, 8)}`,
    prenom: body.prenom,
    nom: body.nom,
    email,
    role: 'apprenant' as const,
  }
  utilisateurs.push(utilisateur)
  ouvrirSession(event, utilisateur)
  return utilisateur
})
