/**
 * Texte mis en forme : rendu côté affichage.
 *
 * Deux formes coexistent en base, et c'est voulu :
 *
 * - **Du HTML**, produit par l'éditeur du back-office (`UiChampTexteRiche`) et
 *   assaini côté serveur à l'enregistrement (`server/utils/texteRiche.ts`).
 *   C'est la seule forme écrite désormais.
 * - **Du texte brut**, hérité — articles rédigés en Markdown allégé, fiches de
 *   module saisies en paragraphes simples. Il n'est pas réécrit en masse :
 *   toucher en bloc au contenu éditorial pour un changement de format serait
 *   un risque gratuit. Chaque enregistrement le convertit, et le jour où plus
 *   rien n'est au vieux format, `texteVersHtml` pourra disparaître.
 *
 * Le contenu hérité est **toujours échappé** avant d'être balisé : seules les
 * balises de structure viennent du code. Le contenu neuf, lui, est déjà assaini
 * à l'écriture — c'est là, et seulement là, que se joue la protection.
 */

/** Balises que l'éditeur produit et que l'assainisseur laisse passer. Sert au
 *  repérage du format, pas au contrôle — celui-ci est côté serveur. */
const OUVRANTE = /<(p|h2|h3|ul|ol|li|strong|em|a|br)\b[^>]*>/i

/** Un contenu déjà balisé vient de l'éditeur ; sinon c'est de l'hérité. */
export function estHtml(valeur: string | null | undefined): boolean {
  return !!valeur && OUVRANTE.test(valeur)
}

export function echapper(texte: string): string {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Rendu du format hérité : titres `##`/`###`, listes numérotées, paragraphes.
 *
 * Repris de l'ancien rendu du blog, à l'identique, pour que les articles déjà
 * écrits s'affichent exactement comme avant.
 */
export function texteVersHtml(contenu: string | null | undefined): string {
  if (!contenu) return ''
  return contenu
    .split('\n\n')
    .map((bloc) => {
      const t = bloc.trim()
      if (!t) return ''
      if (t.startsWith('### ')) return `<h3>${echapper(t.slice(4))}</h3>`
      if (t.startsWith('## ')) return `<h2>${echapper(t.slice(3))}</h2>`
      if (/^\d+\.\s/.test(t)) {
        const items = t
          .split('\n')
          .map((l) => `<li>${echapper(l.replace(/^\d+\.\s/, ''))}</li>`)
          .join('')
        return `<ol class="my-4 list-decimal space-y-1.5 pl-6 text-[15.5px] text-texte">${items}</ol>`
      }
      // Les retours simples à l'intérieur d'un bloc restent des retours à la ligne.
      return `<p>${echapper(t).replace(/\n/g, '<br>')}</p>`
    })
    .join('')
}

/**
 * HTML à poser dans un `v-html`.
 *
 * Le contenu neuf sort tel quel : il a été assaini à l'écriture, le réassainir
 * à chaque affichage coûterait sans rien ajouter. Le contenu hérité est
 * échappé puis balisé.
 */
export function rendreTexteRiche(valeur: string | null | undefined): string {
  if (!valeur) return ''
  return estHtml(valeur) ? valeur : texteVersHtml(valeur)
}

/**
 * Version texte seul, pour les endroits où le balisage n'a rien à faire :
 * meta description, partage social, aperçus de liste.
 */
export function sansBalises(valeur: string | null | undefined): string {
  if (!valeur) return ''
  return valeur
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}
