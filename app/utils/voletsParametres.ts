import type { SectionAdmin } from '#shared/types'

/**
 * Volets de l'écran Paramètres (planche C, écran 20).
 *
 * Partagés par la page et par la barre latérale : la recette du 13/10 n'avait
 * trouvé ni « Administration des accès », ni « Tracking & pixels », ni les
 * paramètres financiers, rangés dans des onglets sans entrée de menu
 * (ADM-20, ADM-21, ADM-26, ACH-12). « Paramètres » se déplie désormais en un
 * lien par volet, qui ouvre la page sur `?volet=<cle>`.
 */
export type VoletParametres = 'acces' | 'tracking' | 'referencement' | 'attestations' | 'financier' | 'profil'

export const VOLETS_PARAMETRES: {
  cle: VoletParametres
  libelle: string
  /** Section exigée pour voir le volet ; `null` = tout compte d'administration. */
  section: SectionAdmin | null
  /** Volet dont l'écriture est réservée à l'administrateur supérieur. */
  verrou?: boolean
}[] = [
  { cle: 'acces', libelle: 'Administration des accès', section: 'administration-acces' },
  { cle: 'tracking', libelle: 'Tracking & pixels', section: null, verrou: true },
  { cle: 'referencement', libelle: 'Référencement · règles globales', section: null, verrou: true },
  { cle: 'attestations', libelle: 'Attestations', section: 'attestations', verrou: true },
  { cle: 'financier', libelle: 'Paramètres financiers', section: null, verrou: true },
  { cle: 'profil', libelle: 'Mon profil', section: null },
]

export const VOLET_PARAMETRES_DEFAUT: VoletParametres = 'profil'
