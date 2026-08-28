import { creerReinitialisation, trouverUtilisateurParEmail } from '../../database/comptes'
import { creerJeton } from '../../utils/motDePasse'

/** Spec §8 : lien de réinitialisation valable 30 minutes. */
const VALIDITE_MINUTES = 30

export default defineEventHandler(async (event) => {
  const { email } = await readBody<{ email?: string }>(event)
  const adresse = (email ?? '').trim()

  if (adresse) {
    const utilisateur = await trouverUtilisateurParEmail(adresse)
    if (utilisateur) {
      const { clair, hache } = creerJeton()
      const expire = new Date(Date.now() + VALIDITE_MINUTES * 60 * 1000)
      await creerReinitialisation(utilisateur.id, hache, expire)

      const config = useRuntimeConfig()
      const lien = `${config.public.siteUrl}/reinitialiser-mot-de-passe?jeton=${clair}`

      // Aucun service d'envoi n'est branché : le lien est journalisé côté
      // serveur pour que l'équipe puisse le transmettre à la main pendant cette
      // période. À remplacer par un envoi d'e-mail dès que le fournisseur est
      // choisi — voir « Reste à faire » du README.
      console.info(`[réinitialisation] ${utilisateur.email} → ${lien}`)
    }
  }

  // Réponse volontairement identique que le compte existe ou non : elle ne doit
  // pas permettre de découvrir quelles adresses sont inscrites.
  return { ok: true, message: 'Si un compte existe, un lien de réinitialisation a été envoyé.' }
})
