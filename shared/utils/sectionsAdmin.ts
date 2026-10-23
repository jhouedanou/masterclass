import type { SectionAdmin } from '#shared/types'

/**
 * Les sections du back-office, telles que l'énumération `section_admin` de la
 * base les connaît.
 *
 * Le type seul ne contrôle rien à l'exécution : un corps de requête peut
 * porter n'importe quelle chaîne. Cette liste sert à valider ce qu'on accorde
 * avant de l'écrire. Le `Record` force à la tenir à jour : une section ajoutée
 * au type et oubliée ici ne compile pas.
 */
const PRESENCE: Record<SectionAdmin, true> = {
  'administration-acces': true,
  'cms-site-vitrine': true,
  'fiches-commerciales': true,
  'modules-chapitres': true,
  'offres-commerciales': true,
  formateurs: true,
  'calendrier-sessions': true,
  'coaching-prive': true,
  'candidatures-formateurs': true,
  'ressources-scripts': true,
  blog: true,
  'referencement-contenu': true,
  'referencement-avance': true,
  'historique-versions': true,
  'statistiques-performance': true,
  'performances-marketing': true,
  'transactions-paiements': true,
  apprenants: true,
  attestations: true,
}

export const SECTIONS_ADMIN = Object.keys(PRESENCE) as SectionAdmin[]

export function estSectionAdmin(valeur: unknown): valeur is SectionAdmin {
  return typeof valeur === 'string' && Object.hasOwn(PRESENCE, valeur)
}
