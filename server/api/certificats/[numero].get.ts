import QRCode from 'qrcode'
import { trouverCertificat } from '../../database/commerce'
import { exigerUtilisateur } from '../../utils/session'

/**
 * L'attestation complète et son QR code, pour le document imprimable.
 *
 * Réservée à son titulaire : elle porte l'identité, l'identifiant du compte et
 * celui du module. La vérification publique, elle, passe par
 * `/api/verifier/[numero]`, qui n'expose que ce qui figure sur le document.
 *
 * Un numéro qui ne lui appartient pas est traité comme inexistant : répondre
 * 403 confirmerait au passage que l'attestation existe.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const numero = getRouterParam(event, 'numero')
  const certificat = await trouverCertificat(numero ?? '')
  if (!certificat || certificat.utilisateurId !== utilisateur.id) {
    throw createError({ statusCode: 404, statusMessage: 'Certificat introuvable' })
  }
  const config = useRuntimeConfig()
  const lienVerification = `${config.public.siteUrl}/verifier/${certificat.numero}`
  const qrDataUrl = await QRCode.toDataURL(lienVerification, { margin: 0, width: 320 })

  return { certificat, lienVerification, qrDataUrl }
})
