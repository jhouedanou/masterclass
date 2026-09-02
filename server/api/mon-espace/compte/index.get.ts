import { trouverPersona } from '../../../database/comptes'
import { exigerUtilisateur } from '../../../utils/session'

/** Compte et fiche apprenant de l'utilisateur connecté. */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const persona = await trouverPersona(utilisateur.id)
  return { utilisateur, persona: persona ?? {} }
})
