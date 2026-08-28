import { enregistrerJournal } from '../../database/administration'
import { enregistrerVersion } from '../../database/backoffice'
import { majArticle, trouverArticleParSlug } from '../../database/blog'
import { listerArticles } from '../../database/blog'
import { exigerSection } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'blog')
  const body = await readBody<{ id: string } & Record<string, unknown>>(event)

  const articles = await listerArticles()
  const actuel = articles.find((a) => a.id === body.id)
  if (!actuel) throw createError({ statusCode: 404, statusMessage: 'Article introuvable' })

  const auteur = `${admin.prenom} ${admin.nom}`
  await enregistrerVersion({
    entite: 'articles',
    entiteId: actuel.id,
    libelle: actuel.titre,
    contenu: { ...actuel },
    auteur,
  })

  const { id, ...champs } = body
  const modifie = await majArticle(id, champs as never)

  await enregistrerJournal(
    auteur,
    body.statut === 'publie' && actuel.statut !== 'publie'
      ? 'a publié l’article'
      : 'a modifié l’article',
    modifie.titre,
  )
  return modifie
})
