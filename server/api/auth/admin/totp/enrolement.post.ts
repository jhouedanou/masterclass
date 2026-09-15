import QRCode from 'qrcode'
import { trouverUtilisateur } from '../../../../database/comptes'
import { deposerSecret } from '../../../../database/totp'
import { lireSessionPartielle } from '../../../../utils/session'
import { genererSecret, secretLisible, uriOtpauth } from '../../../../utils/totp'

/**
 * Enrôlement, étape 1 : remet un secret neuf et son QR code.
 *
 * Le secret est déposé mais **pas activé** : il ne le sera qu'après un premier
 * code correct (`activer.post.ts`). Un QR mal scanné condamnerait sinon le
 * compte, puisque plus personne ne pourrait produire le code attendu.
 *
 * Réservé à une connexion dont le mot de passe vient d'être accepté : c'est
 * `lireSessionPartielle` qui en atteste, et elle refuse une attente périmée.
 */
export default defineEventHandler(async (event) => {
  const utilisateurId = await lireSessionPartielle(event)
  if (!utilisateurId) {
    throw createError({ statusCode: 401, statusMessage: 'Recommencez la connexion : aucune vérification en cours.' })
  }

  const utilisateur = await trouverUtilisateur(utilisateurId)
  if (!utilisateur || (utilisateur.role !== 'admin-contenu' && utilisateur.role !== 'admin-superieur')) {
    throw createError({ statusCode: 403, statusMessage: 'Compte sans accès à l’administration.' })
  }

  const secret = genererSecret()
  await deposerSecret(utilisateur.id, secret)

  const uri = uriOtpauth(utilisateur.email, secret)
  return {
    // Même fabrication que le QR des attestations (server/api/certificats).
    qr: await QRCode.toDataURL(uri, { margin: 1, width: 240 }),
    // Pour la saisie manuelle quand l'appareil ne peut pas scanner.
    secret: secretLisible(secret),
  }
})
