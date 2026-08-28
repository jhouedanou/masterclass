import { enregistrerJournal } from '../../database/administration'
import { creerArticle } from '../../database/blog'
import type { CategorieArticleSql } from '../../database/types'
import { exigerSection } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'blog')
  const body = await readBody<{
    slug: string
    titre: string
    chapo: string
    contenu: string
    auteurId: string
    categorie: CategorieArticleSql
  }>(event)

  if (!body.titre?.trim() || !body.slug?.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'Titre et URL sont requis' })
  }

  const article = await creerArticle({
    slug: body.slug.trim(),
    titre: body.titre.trim(),
    chapo: body.chapo ?? '',
    contenu: body.contenu ?? '',
    auteurId: body.auteurId,
    categorie: body.categorie,
  })

  await enregistrerJournal(`${admin.prenom} ${admin.nom}`, 'a créé l’article', article.titre)
  return article
})
