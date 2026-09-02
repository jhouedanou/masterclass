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
