import { listerArticles, trouverArticleParSlug } from '../../database/blog'
import { listerModules, trouverFormateur } from '../../database/catalogue'
import { estDisponible, formateurPublic, modulePublic } from '../../utils/public'

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
    // Projections publiques : l'objet complet publiait les coordonnées de
    // l'auteur, et les modules liés leurs transcriptions — brouillons compris.
    auteur: auteur ? formateurPublic(auteur) : null,
    modulesLies: modules.filter((m) => article.modulesLies.includes(m.id) && estDisponible(m)).map(modulePublic),
    associes: articles
      .filter((a) => a.id !== article.id && a.statut === 'publie')
      .filter((a) => a.categorie === article.categorie)
      .slice(0, 3),
  }
})
