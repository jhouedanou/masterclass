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

/**
 * Sujets du formulaire de contact : une liste fermée. Le sujet est recopié dans
 * l'accusé de réception, envoyé à une adresse que personne n'a vérifiée ; un
 * texte libre à cet endroit ferait de la plateforme un relais de messages vers
 * n'importe quelle boîte, sous notre nom.
 */
export const SUJETS_CONTACT = [
  'Paiement',
  'Accès à un module',
  'Session de coaching',
  'Certificat de participation',
  'Problème technique',
  'Autre demande',
] as const

export type SujetContact = (typeof SUJETS_CONTACT)[number]

export const ORGANISATION = {
  marque: 'E-Masterclass Big Five',
  raisonSociale: 'BigFiveAbidjan SARL',
  email: 'contact@bigfive.ci',
  ville: 'Abidjan, Côte d’Ivoire',
} as const
