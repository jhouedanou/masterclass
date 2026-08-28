import QRCode from 'qrcode'
import { trouverCertificat } from '../../database/commerce'

/**
 * Lecture publique d'un certificat par son numéro : c'est la cible du QR code
 * imprimé sur le document. La page /verifier/[numero] est en noindex.
 */
export default defineEventHandler(async (event) => {
  const numero = getRouterParam(event, 'numero')
  const certificat = await trouverCertificat(numero ?? '')
  if (!certificat) {
    throw createError({ statusCode: 404, statusMessage: 'Certificat introuvable' })
  }
  const config = useRuntimeConfig()
  const lienVerification = `${config.public.siteUrl}/verifier/${certificat.numero}`
  const qrDataUrl = await QRCode.toDataURL(lienVerification, { margin: 0, width: 320 })

  return { certificat, lienVerification, qrDataUrl }
})
