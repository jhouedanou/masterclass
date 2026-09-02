import { listerArticles } from '../../../database/blog'
import { listerFormateurs, listerModules } from '../../../database/catalogue'
import { exigerSection } from '../../../utils/session'

/** Un article pour l'éditeur (planche C, écran 22), avec les auteurs et les
 *  modules qu'on peut lui lier. `nouveau` renvoie un gabarit vide. */
export default defineEventHandler(async (event) => {
  await exigerSection(event, 'blog')
  const id = getRouterParam(event, 'id') ?? ''

  const [articles, formateurs, modules] = await Promise.all([listerArticles(), listerFormateurs(), listerModules()])
  const article = id === 'nouveau' ? null : (articles.find((a) => a.id === id) ?? null)
  if (id !== 'nouveau' && !article) {
    throw createError({ statusCode: 404, statusMessage: 'Article introuvable' })
  }

  return {
    article,
    auteurs: formateurs.map((f) => ({ id: f.id, nom: f.nom })),
    modules: modules.map((m) => ({ id: m.id, titre: m.titre, programme: m.programme })),
    autres: articles
      .filter((a) => a.id !== id)
      .map((a) => ({ id: a.id, title: a.seo.title, metaDescription: a.seo.metaDescription })),
  }
})
