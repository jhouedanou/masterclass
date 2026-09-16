import type { Transaction } from '#shared/types'

/**
 * Repères de période partagés par les écrans d'administration.
 *
 * Les objectifs du back-office sont mensuels (« 450 inscriptions / mois »,
 * « 4 500 000 F / mois ») : les indicateurs comparés à ces objectifs portent
 * donc sur une fenêtre glissante de trente jours, et l'évolution se lit contre
 * les trente jours précédents.
 */
export const FENETRE_JOURS = 30

/** Date au format « AAAA-MM-JJ », comme les colonnes `date` de la base. */
export function jourDecale(jours: number): string {
  return new Date(Date.now() - jours * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export const DEBUT_PERIODE = () => jourDecale(FENETRE_JOURS)
export const DEBUT_PERIODE_PRECEDENTE = () => jourDecale(FENETRE_JOURS * 2)

export function transactionsReussies(transactions: Transaction[]): Transaction[] {
  return transactions.filter((t) => t.statut === 'reussie')
}

/** Transactions réussies dont la date tombe dans l'intervalle [du, au[. */
export function surPeriode(transactions: Transaction[], du: string, au?: string): Transaction[] {
  return transactionsReussies(transactions).filter(
    (t) => t.date >= du && (au === undefined || t.date < au),
  )
}

export function chiffreAffaires(transactions: Transaction[]): number {
  return transactions.reduce((somme, t) => somme + t.montant, 0)
}

/**
 * Chiffre d'affaires jour par jour sur la fenêtre, du plus ancien au plus
 * récent. Les journées sans vente valent zéro : l'histogramme garde son échelle
 * de temps régulière.
 */
export function chiffreAffairesQuotidien(transactions: Transaction[], jours = FENETRE_JOURS) {
  const reussies = transactionsReussies(transactions)
  const parJour = new Map<string, number>()
  for (const t of reussies) parJour.set(t.date, (parJour.get(t.date) ?? 0) + t.montant)

  return Array.from({ length: jours }, (_, i) => parJour.get(jourDecale(jours - 1 - i)) ?? 0)
}

/** Évolution en pourcentage entre deux périodes. `null` si la période de
 *  référence est vide — un pourcentage n'aurait alors aucun sens. */
export function evolution(actuel: number, precedent: number): number | null {
  if (precedent === 0) return null
  return Math.round(((actuel - precedent) / precedent) * 100)
}

/** Famille d'appareil déduite du user-agent journalisé à la connexion. */
export function familleAppareil(userAgent: string | null | undefined): 'Mobile' | 'Desktop' | null {
  if (!userAgent) return null
  return /Mobi|Android|iPhone|iPad|Opera Mini/i.test(userAgent) ? 'Mobile' : 'Desktop'
}

/** Navigateur lisible depuis le user-agent (« Chrome Android », « Safari iOS »…). */
export function navigateurDepuisUserAgent(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null
  const os = /Android/i.test(userAgent)
    ? 'Android'
    : /iPhone|iPad/i.test(userAgent)
      ? 'iOS'
      : /Windows/i.test(userAgent)
        ? 'Windows'
        : /Mac OS/i.test(userAgent)
          ? 'macOS'
          : ''
  const nav = /Opera Mini/i.test(userAgent)
    ? 'Opera Mini'
    : /Edg\//i.test(userAgent)
      ? 'Edge'
      : /OPR\//i.test(userAgent)
        ? 'Opera'
        : /Firefox\//i.test(userAgent)
          ? 'Firefox'
          : /Chrome\//i.test(userAgent)
            ? 'Chrome'
            : /Safari\//i.test(userAgent)
              ? 'Safari'
              : 'Autre'
  return os ? `${nav} ${os}` : nav
}

/** Part en pourcentage, arrondie ; `null` quand le total est vide. */
export function part(n: number, total: number): number | null {
  return total ? Math.round((n / total) * 100) : null
}
