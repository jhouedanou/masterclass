import { lireReglagesTracking } from '../database/backoffice'

/**
 * Identifiants de mesure destinés au navigateur.
 *
 * Ce qui part d'ici finit dans le code source de la page : c'est le cas de
 * tout traqueur, et rien de secret ne doit s'y trouver. Le jeton de l'API
 * Conversions, lui, sert à des appels serveur et ne sort jamais — l'exposer
 * permettrait à n'importe qui d'envoyer de faux événements au nom de la
 * plateforme.
 */
export default defineEventHandler(async () => {
  const reglages = await lireReglagesTracking()
  return {
    gtmConteneur: reglages.gtmConteneur,
    ga4Mesure: reglages.ga4Mesure,
    metaPixelId: reglages.metaPixelId,
    tiktokPixelId: reglages.tiktokPixelId,
    linkedinPartnerId: reglages.linkedinPartnerId,
    codePersonnalise: reglages.codePersonnalise,
  }
})
