/**
 * Référentiels de valeurs des champs à choix multiple du profil apprenant :
 * réseaux gérés, outils utilisés, canaux de vente, présence en ligne.
 *
 * Ces quatre champs étaient en saisie libre et recevaient n'importe quoi —
 * orthographes concurrentes d'un même réseau, abréviations, valeurs
 * fantaisistes — ce qui rendait toute lecture agrégée impossible.
 *
 * Distinction voulue, reprise de `telephone.ts` :
 *
 * - La **table d'affichage** vit en base (`referentiels`) et s'administre. Elle
 *   change au fil des usages : un réseau apparaît, un outil tombe en désuétude.
 * - Le **contrôle** ne connaît que la forme d'une clé. Il ne se périme pas, et
 *   surtout il n'invalide jamais une valeur historique : une fiche enregistrée
 *   avant qu'un outil ne sorte du référentiel doit rester enregistrable telle
 *   quelle, même si son propriétaire n'y touche pas.
 *
 * La colonne garde les **clés**, jointes par des virgules (`instagram,tiktok`).
 * Renommer « X » en « X (Twitter) » dans le back-office se propage alors à
 * toutes les fiches, sans migration.
 */

export type CategorieReferentiel = 'reseau' | 'outil' | 'canal' | 'audience'

export interface EntreeReferentiel {
  id: string
  categorie: CategorieReferentiel
  /** Identifiant stable, conservé en base. Minuscules, chiffres et tirets. */
  cle: string
  /** Texte affiché. Peut changer sans toucher aux fiches. */
  libelle: string
  ordre: number
  actif: boolean
}

/** Le champ auquel chaque catégorie s'applique, pour l'écran d'administration. */
export const CATEGORIES: { valeur: CategorieReferentiel; libelle: string; usage: string }[] = [
  { valeur: 'reseau', libelle: 'Réseaux sociaux', usage: 'Réseaux gérés · Présence en ligne' },
  { valeur: 'outil', libelle: 'Outils', usage: 'Outils utilisés' },
  { valeur: 'canal', libelle: 'Canaux de vente', usage: 'Canaux de vente actuels' },
  { valeur: 'audience', libelle: 'Tranches d’audience', usage: 'Taille d’audience, réseau par réseau' },
]

/**
 * Forme d'une clé : minuscules, chiffres et tirets, de 1 à 40 caractères.
 *
 * Volontairement large, et sans consultation du référentiel. Le contrôle sert à
 * écarter ce qui n'est manifestement pas une clé — une phrase, un séparateur
 * égaré — pas à arbitrer le contenu de la table, qui bouge.
 */
export function cleValide(valeur: string): boolean {
  return /^[a-z0-9-]{1,40}$/.test(valeur)
}

/** Découpe la valeur stockée en clés, en écartant les vides et les doublons. */
export function separerCles(valeur: string | null | undefined): string[] {
  if (!valeur) return []
  return [...new Set(valeur.split(',').map((v) => v.trim()).filter(Boolean))]
}

/** Recompose la valeur à stocker. */
export function joindreCles(cles: readonly string[]): string {
  return [...new Set(cles.map((c) => c.trim()).filter(Boolean))].join(',')
}

/**
 * Libellés d'une valeur stockée, pour l'affichage.
 *
 * Une clé absente du référentiel — entrée supprimée, valeur historique jamais
 * appariée à la migration — est rendue telle quelle plutôt qu'escamotée : mieux
 * vaut une fiche qui montre `boutique-physique` qu'une fiche qui paraît vide.
 */
export function libellesReferentiel(
  valeur: string | null | undefined,
  entrees: readonly EntreeReferentiel[],
): string {
  return separerCles(valeur)
    .map((cle) => entrees.find((e) => e.cle === cle)?.libelle ?? cle)
    .join(', ')
}

/** Les entrées d'une catégorie, dans l'ordre d'affichage voulu. */
export function entreesDe(
  entrees: readonly EntreeReferentiel[],
  categorie: CategorieReferentiel,
): EntreeReferentiel[] {
  return entrees
    .filter((e) => e.categorie === categorie)
    .sort((a, b) => a.ordre - b.ordre || a.libelle.localeCompare(b.libelle, 'fr'))
}

/**
 * Normalise un libellé en clé. Sert à la reprise de l'existant et à la saisie
 * d'une nouvelle entrée au back-office, pour que les deux produisent la même
 * clé à partir du même mot.
 */
export function cleDepuisLibelle(libelle: string): string {
  return libelle
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

/**
 * Valeurs appariées : une clé de réseau, une tranche d'audience.
 *
 * Même convention que les listes simples — segments séparés par des virgules —
 * avec un `:` à l'intérieur de chaque segment : `instagram:1k-10k,tiktok:plus-100k`.
 * La colonne reste du `text`, et `renseigne()` continue de compter le champ à
 * l'identique : les pourcentages de complétion ne bougent pas.
 */
export function separerPaires(valeur: string | null | undefined): Record<string, string> {
  const paires: Record<string, string> = {}
  for (const segment of separerCles(valeur)) {
    const coupure = segment.indexOf(':')
    // Un segment sans `:` est une valeur d'avant l'appariement : on l'ignore
    // plutôt que de l'attribuer au hasard à un réseau.
    if (coupure <= 0) continue
    const cle = segment.slice(0, coupure).trim()
    const valeurPaire = segment.slice(coupure + 1).trim()
    if (cle && valeurPaire) paires[cle] = valeurPaire
  }
  return paires
}

/** Recompose la valeur à stocker, en écartant les paires vides. */
export function joindrePaires(paires: Record<string, string | undefined>): string {
  return Object.entries(paires)
    .filter(([cle, valeur]) => cle && valeur)
    .map(([cle, valeur]) => `${cle}:${valeur}`)
    .join(',')
}

/**
 * Rend les paires lisibles : « Instagram : 1 000 à 10 000 abonnés ».
 *
 * Comme `libellesReferentiel`, une clé inconnue est rendue telle quelle plutôt
 * qu'escamotée.
 */
export function libellesPaires(
  valeur: string | null | undefined,
  entrees: readonly EntreeReferentiel[],
): string {
  const libelle = (cle: string) => entrees.find((e) => e.cle === cle)?.libelle ?? cle
  return Object.entries(separerPaires(valeur))
    .map(([cle, tranche]) => `${libelle(cle)} : ${libelle(tranche)}`)
    .join(' · ')
}
