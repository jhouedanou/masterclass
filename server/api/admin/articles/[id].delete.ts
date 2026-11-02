import { enregistrerJournal } from '../../../database/administration'
import { enregistrerVersion } from '../../../database/backoffice'
import { listerArticles, supprimerArticle } from '../../../database/blog'
import { exigerSection } from '../../../utils/session'

/**
 * Suppression définitive d'un article. Une dernière version est gardée dans
 * l'historique (écran Historique & versions), comme avant toute
 * modification : une suppression par erreur reste rattrapable.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'blog')
  const id = getRouterParam(event, 'id') ?? ''
  const article = (await listerArticles()).find((a) => a.id === id)
  if (!article) throw createError({ statusCode: 404, statusMessage: 'Article introuvable' })

  const auteur = `${admin.prenom} ${admin.nom}`
  await enregistrerVersion({ entite: 'articles', entiteId: article.id, libelle: article.titre, contenu: { ...article }, auteur })
  await supprimerArticle(article.id)
  await enregistrerJournal(auteur, 'a supprimé un article', article.titre)
  return { ok: true }
})
