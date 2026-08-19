/**
 * Point de contact WhatsApp officiel de la plateforme.
 * Format international de la Côte d'Ivoire depuis 2021 : l'indicatif 225 est
 * suivi des 10 chiffres du numéro, zéro initial conservé.
 * Vérifié : https://wa.me/2250575152144 résout bien vers ce numéro.
 */
export const WHATSAPP = {
  affichage: '+225 05 75 15 21 44',
  e164: '+2250575152144',
  waId: '2250575152144',
} as const

/** Construit un lien wa.me avec un message pré-rempli. */
export function lienWhatsApp(message?: string): string {
  const base = `https://wa.me/${WHATSAPP.waId}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

export const ORGANISATION = {
  marque: 'E-Masterclass Big Five',
  raisonSociale: 'BigFiveAbidjan SARL',
  email: 'contact@bigfive.ci',
  ville: 'Abidjan, Côte d’Ivoire',
} as const
