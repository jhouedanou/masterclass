import QRCode from 'qrcode'
import { lireReglagesAttestation } from '../../database/administration'
import { trouverFormateur, trouverModule } from '../../database/catalogue'
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

  /**
   * Les deux griffes du pied de page, résolues à l'affichage et non figées
   * dans le certificat à sa génération.
   *
   * Une attestation délivrée avant qu'une signature n'existe se trouve donc
   * signée dès que la griffe est déposée. Figer aurait laissé sans recours
   * tout ce qui a déjà été délivré — et aucune griffe n'existait jusqu'ici.
   *
   * Le module est relu pour son formateur : le certificat n'en garde que le
   * nom, qui ne suffit pas à retrouver la fiche.
   */
  const [reglages, moduleCertifie] = await Promise.all([
    lireReglagesAttestation(),
    trouverModule(certificat.moduleId),
  ])
  const formateur = moduleCertifie ? await trouverFormateur(moduleCertifie.formateurId) : null

  return {
    certificat,
    lienVerification,
    qrDataUrl,
    signatures: {
      formateur: { nom: certificat.formateur, image: formateur?.signature ?? '' },
      direction: { nom: reglages.signataire, image: reglages.signature },
    },
  }
})
