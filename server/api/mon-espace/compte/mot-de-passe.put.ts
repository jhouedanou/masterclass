import { enregistrerJournal } from '../../../database/administration'
import { definirMotDePasse, trouverEmpreinte } from '../../../database/comptes'
import { hacherMotDePasse, refusMotDePasse, verifierMotDePasse } from '../../../utils/motDePasse'
import { exigerUtilisateur } from '../../../utils/session'

/**
 * Changement de mot de passe d'un compte connecté — apprenant, formateur ou
 * administrateur (planche B, écran 11 ; planche C, écran 20 « Mon profil »).
 * Le mot de passe courant est exigé ; un changement sur un compte
 * d'administration est journalisé.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const { actuel, nouveau } = await readBody<{ actuel?: string; nouveau?: string }>(event)

  const valide = await verifierMotDePasse(actuel ?? '', await trouverEmpreinte(utilisateur.id))
  if (!valide) throw createError({ statusCode: 403, statusMessage: 'Mot de passe actuel incorrect' })

  const refus = refusMotDePasse(nouveau ?? '')
  if (refus) throw createError({ statusCode: 422, statusMessage: refus })
  if (nouveau === actuel) {
    throw createError({ statusCode: 422, statusMessage: 'Choisissez un mot de passe différent de l’actuel' })
  }

  await definirMotDePasse(utilisateur.id, await hacherMotDePasse(nouveau!))

  if (utilisateur.role === 'admin-contenu' || utilisateur.role === 'admin-superieur') {
    await enregistrerJournal(`${utilisateur.prenom} ${utilisateur.nom}`, 'a changé son mot de passe', 'compte d’administration')
  }
  return { ok: true }
})
