import { listerArticles } from '../../database/blog'
import { listerFormateurs } from '../../database/catalogue'

/** Articles publiés, avec pagination (planche A, écran 12 : « ← 1 2 3 → »). */
export const ARTICLES_PAR_PAGE = 9

export default defineEventHandler(async (event) => {
  const { categorie, page, parPage } = getQuery(event) as Record<string, string | undefined>

  const [articles, formateurs] = await Promise.all([listerArticles(), listerFormateurs()])

  const liste = articles
    .filter((a) => a.statut === 'publie')
    .filter((a) => !categorie || a.categorie === categorie)
    .sort((a, b) => (b.publieLe ?? '').localeCompare(a.publieLe ?? ''))
    .map((a) => ({ ...a, auteur: formateurs.find((f) => f.id === a.auteurId) ?? null }))

  // Sans `page`, la liste complète est renvoyée (accueil, sitemap, back-office).
  if (page === undefined) return liste

  const taille = Math.max(1, Math.min(50, Number(parPage) || ARTICLES_PAR_PAGE))
  const totalPages = Math.max(1, Math.ceil(liste.length / taille))
  const courante = Math.min(totalPages, Math.max(1, Number(page) || 1))
  return {
    articles: liste.slice((courante - 1) * taille, courante * taille),
    page: courante,
    totalPages,
    total: liste.length,
  }
})
