import { listerArticles } from '../../database/blog'
import { listerFormateurs } from '../../database/catalogue'
import { exigerSection } from '../../utils/session'

/** Tous les articles, brouillons compris — la liste publique les exclut. */
export default defineEventHandler(async (event) => {
  await exigerSection(event, 'blog')
  const [articles, formateurs] = await Promise.all([listerArticles(), listerFormateurs()])
  return articles.map((a) => ({ ...a, auteur: formateurs.find((f) => f.id === a.auteurId) ?? null }))
})
