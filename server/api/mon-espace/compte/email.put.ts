import { majEmail, trouverEmpreinte } from '../../../database/comptes'
import { verifierMotDePasse } from '../../../utils/motDePasse'
import { exigerUtilisateur } from '../../../utils/session'

/** Changement d'adresse e-mail : le mot de passe courant est exigé. */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const { email, motDePasse } = await readBody<{ email?: string; motDePasse?: string }>(event)

  const adresse = (email ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adresse)) {
    throw createError({ statusCode: 422, statusMessage: 'Adresse e-mail invalide' })
  }
  const valide = await verifierMotDePasse(motDePasse ?? '', await trouverEmpreinte(utilisateur.id))
  if (!valide) throw createError({ statusCode: 403, statusMessage: 'Mot de passe incorrect' })

  return await majEmail(utilisateur.id, adresse)
})
