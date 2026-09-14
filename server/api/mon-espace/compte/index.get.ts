import { completionProfil, programmeDeReference, trouverPersona } from '../../../database/comptes'
import { exigerUtilisateur } from '../../../utils/session'

/** Compte et fiche apprenant de l'utilisateur connecté, avec sa complétion. */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const [persona, programme, completion] = await Promise.all([
    trouverPersona(utilisateur.id),
    programmeDeReference(utilisateur.id),
    completionProfil(utilisateur),
  ])
  return { utilisateur: { ...utilisateur, completionProfil: completion }, persona: persona ?? {}, programme }
})
