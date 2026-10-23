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
 * Lien wa.me vers un numéro saisi par quelqu'un d'autre — un candidat
 * formateur, par exemple. `lienWhatsApp` vise toujours le numéro de Big Five :
 * s'en servir pour écrire à un candidat ouvrait une conversation avec nous-mêmes.
 *
 * La saisie est libre (« +225 07 00 00 00 00 », « 00225… ») : seuls les
 * chiffres comptent, mais l'indicatif doit y être. Un numéro national
 * (« 07 00… ») ne dit pas son pays, et wa.me le lirait comme un indicatif :
 * plutôt rien qu'un lien vers un inconnu.
 */
export function lienWhatsAppVers(numero: string | null | undefined, message?: string): string | null {
  const brut = (numero ?? '').trim()
  const international = brut.startsWith('+') ? brut.slice(1) : brut.startsWith('00') ? brut.slice(2) : ''
  const waId = international.replace(/\D/g, '')
  if (!/^[1-9]\d{7,14}$/.test(waId)) return null
  const base = `https://wa.me/${waId}`
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
