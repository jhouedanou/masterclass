import { enregistrerJournal } from '../../../../database/administration'
import { trouverUtilisateur } from '../../../../database/comptes'
import { activerTotp, lireTotp, regenererCodesSecours } from '../../../../database/totp'
import { compterEchecAdmin, lireSessionPartielle } from '../../../../utils/session'
import { verifierTotp } from '../../../../utils/totp'

/**
 * Enrôlement, étape 2 : un premier code confirme que l'application est bien
 * réglée, puis le secret est activé et les codes de secours remis.
 *
 * Ces codes sont renvoyés **en clair ici et nulle part ailleurs** : la base
 * n'en garde que l'empreinte. L'écran doit donc insister pour qu'ils soient
 * conservés avant de continuer.
 *
 * La session n'est pas ouverte : l'appelant enchaîne sur `verifier-code` avec
 * un nouveau code. Ouvrir ici court-circuiterait la preuve que l'application
 * produit bien des codes à la demande, et pas seulement celui-là.
 */
export default defineEventHandler(async (event) => {
  const { code } = await readBody<{ code?: string }>(event)

  const utilisateurId = await lireSessionPartielle(event)
  if (!utilisateurId) {
    throw createError({ statusCode: 401, statusMessage: 'Recommencez la connexion : aucune vérification en cours.' })
  }

  const utilisateur = await trouverUtilisateur(utilisateurId)
  if (!utilisateur || (utilisateur.role !== 'admin-contenu' && utilisateur.role !== 'admin-superieur')) {
    throw createError({ statusCode: 403, statusMessage: 'Compte sans accès à l’administration.' })
  }

  const etat = await lireTotp(utilisateur.id)
  if (!etat.secret) {
    throw createError({ statusCode: 409, statusMessage: 'Aucun enrôlement en cours : rescannez le QR code.' })
  }
  if (etat.activeLe) {
    throw createError({ statusCode: 409, statusMessage: 'Double authentification déjà active sur ce compte.' })
  }

  const pas = verifierTotp(etat.secret, code ?? '')
  if (pas === null) {
    const { restants } = await compterEchecAdmin(event)
    throw createError({
      statusCode: 401,
      statusMessage: restants
        ? `Code incorrect : ${restants} essai${restants > 1 ? 's' : ''} restant${restants > 1 ? 's' : ''}.`
        : 'Trop d’essais : recommencez la connexion.',
    })
  }

  await activerTotp(utilisateur.id, pas)
  const codesSecours = await regenererCodesSecours(utilisateur.id)

  await enregistrerJournal(
    `${utilisateur.prenom} ${utilisateur.nom}`,
    'a activé la double authentification par application',
    utilisateur.email,
  )

  return { codesSecours }
})
