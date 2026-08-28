import { listerArticles } from '../../database/blog'
import { listerFormateurs } from '../../database/catalogue'

export default defineEventHandler(async (event) => {
  const { categorie } = getQuery(event) as Record<string, string | undefined>

  const [articles, formateurs] = await Promise.all([listerArticles(), listerFormateurs()])

  return articles
    .filter((a) => a.statut === 'publie')
    .filter((a) => !categorie || a.categorie === categorie)
    .sort((a, b) => (b.publieLe ?? '').localeCompare(a.publieLe ?? ''))
    .map((a) => ({ ...a, auteur: formateurs.find((f) => f.id === a.auteurId) ?? null }))
})
