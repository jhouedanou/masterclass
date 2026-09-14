import { completionProfil } from '../../database/comptes'
import { lireSession } from '../../utils/session'

/** Session courante, enrichie de la complétion du profil apprenant (planche B). */
export default defineEventHandler(async (event) => {
  const utilisateur = await lireSession(event)
  if (!utilisateur) return null
  if (utilisateur.role !== 'apprenant') return utilisateur
  return { ...utilisateur, completionProfil: await completionProfil(utilisateur) }
})
