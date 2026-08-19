import QRCode from 'qrcode'
import { certificats } from '../../data/db'

/**
 * Lecture publique d'un certificat par son numéro : c'est la cible du QR code
 * imprimé sur le document. La page /verifier/[numero] est en noindex.
 */
export default defineEventHandler(async (event) => {
  const numero = getRouterParam(event, 'numero')
  const certificat = certificats.find((c) => c.numero === numero)
  if (!certificat) {
    throw createError({ statusCode: 404, statusMessage: 'Certificat introuvable' })
  }
  const config = useRuntimeConfig()
  const lienVerification = `${config.public.siteUrl}/verifier/${certificat.numero}`
  const qrDataUrl = await QRCode.toDataURL(lienVerification, { margin: 0, width: 320 })

  return { certificat, lienVerification, qrDataUrl }
})
