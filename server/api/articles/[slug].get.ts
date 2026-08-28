import { listerArticles, trouverArticleParSlug } from '../../database/blog'
import { listerModules, trouverFormateur } from '../../database/catalogue'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const article = await trouverArticleParSlug(slug ?? '')
  if (!article || article.statut !== 'publie') {
    throw createError({ statusCode: 404, statusMessage: 'Article introuvable' })
  }

  const [auteur, modules, articles] = await Promise.all([
    trouverFormateur(article.auteurId),
    listerModules(),
    listerArticles(),
  ])

  return {
    article,
    auteur,
    modulesLies: modules.filter((m) => article.modulesLies.includes(m.id)),
    associes: articles
      .filter((a) => a.id !== article.id && a.statut === 'publie')
      .filter((a) => a.categorie === article.categorie)
      .slice(0, 3),
  }
})
