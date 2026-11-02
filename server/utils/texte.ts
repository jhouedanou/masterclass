/** Slug d'URL depuis un libellé : minuscules, sans accents, tirets simples. */
export function slugifier(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/** Identifiant court et lisible : `for-` + slug, comme les fiches du seed. */
export function identifiantDepuis(prefixe: string, texte: string): string {
  return `${prefixe}-${slugifier(texte).replace(/-/g, '')}`.slice(0, 40)
}

/**
 * Lien LinkedIn saisi au back-office ou par le formateur : vide (on retire le
 * lien), ou une adresse https de linkedin.com. `linkedin.com/in/x` sans
 * schéma est complété. La base applique la même règle.
 */
export function lienLinkedin(brut: string): string {
  const valeur = brut.trim()
  if (!valeur) return ''
  const complet = /^https?:\/\//i.test(valeur) ? valeur.replace(/^http:/i, 'https:') : `https://${valeur}`
  if (!/^https:\/\/([a-z]{2,3}\.)?(www\.)?linkedin\.com\//i.test(complet)) {
    throw createError({ statusCode: 422, statusMessage: 'Le lien LinkedIn doit être une adresse linkedin.com (ex. https://www.linkedin.com/in/…).' })
  }
  return complet
}
