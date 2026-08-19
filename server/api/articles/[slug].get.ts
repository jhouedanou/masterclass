import { articles, formateurs, modules } from '../../data/db'

export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug')
  const article = articles.find((a) => a.slug === slug)
  if (!article || article.statut !== 'publie') {
    throw createError({ statusCode: 404, statusMessage: 'Article introuvable' })
  }
  return {
    article,
    auteur: formateurs.find((f) => f.id === article.auteurId) ?? null,
    modulesLies: modules.filter((m) => article.modulesLies.includes(m.id)),
    associes: articles
      .filter((a) => a.id !== article.id && a.statut === 'publie')
      .filter((a) => a.categorie === article.categorie)
      .slice(0, 3),
  }
})
