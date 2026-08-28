import type { Article } from '#shared/types'
import { supabase } from './client'
import { traduireErreur, verifier, verifierOptionnel, verifierUn } from './erreurs'
import { versArticle } from './mappers'
import type { CategorieArticleSql } from './types'

/** Lecture du blog. Les modules mis en avant au bas d'un article vivent dans la
 *  table de liaison `articles_modules` et sont recollés ici. */

async function modulesLiesParArticle(articleIds: string[]): Promise<Map<string, string[]>> {
  const groupes = new Map<string, string[]>()
  if (!articleIds.length) return groupes

  const rows = verifier(
    await supabase().from('articles_modules').select('*').in('article_id', articleIds),
    'modules liés aux articles',
  )
  for (const row of rows) {
    const existants = groupes.get(row.article_id)
    if (existants) existants.push(row.module_id)
    else groupes.set(row.article_id, [row.module_id])
  }
  return groupes
}

export async function listerArticles(): Promise<Article[]> {
  const rows = verifier(
    await supabase()
      .from('articles')
      .select('*')
      // Le plus récent d'abord ; les brouillons, sans date, ferment la liste.
      .order('publie_le', { ascending: false, nullsFirst: false }),
    'articles',
  )
  const liens = await modulesLiesParArticle(rows.map((a) => a.id))
  return rows.map((a) => versArticle(a, liens.get(a.id) ?? []))
}

export async function trouverArticleParSlug(slug: string): Promise<Article | null> {
  const row = verifierOptionnel(
    await supabase().from('articles').select('*').eq('slug', slug).maybeSingle(),
    'article',
  )
  if (!row) return null
  return versArticle(row, (await modulesLiesParArticle([row.id])).get(row.id) ?? [])
}

// --- Édition ---------------------------------------------------------------

/**
 * Création d'un article en brouillon. L'identifiant reprend le slug, comme les
 * articles d'origine ; la date de publication est posée à la publication, que
 * la contrainte `article_publie_date` rend obligatoire.
 */
export async function creerArticle(champs: {
  slug: string
  titre: string
  chapo: string
  contenu: string
  auteurId: string
  categorie: CategorieArticleSql
  image?: string
  imageAlt?: string
}): Promise<Article> {
  const { data, error } = await supabase()
    .from('articles')
    .insert({
      id: `art-${champs.slug}`,
      slug: champs.slug,
      titre: champs.titre,
      chapo: champs.chapo,
      contenu: champs.contenu,
      auteur_id: champs.auteurId,
      categorie: champs.categorie,
      image: champs.image ?? '/images/blog/placeholder.svg',
      image_alt: champs.imageAlt ?? '',
      statut: 'brouillon',
      temps_lecture_minutes: tempsLecture(champs.contenu),
    })
    .select('*')
    .single()

  if (error?.code === '23505') {
    throw createError({ statusCode: 409, statusMessage: 'Un article porte déjà cette URL' })
  }
  if (error) throw traduireErreur(error, "création de l'article")

  return versArticle(data)
}

export async function majArticle(
  id: string,
  champs: Partial<
    Pick<
      Article,
      | 'titre'
      | 'chapo'
      | 'contenu'
      | 'auteurId'
      | 'categorie'
      | 'image'
      | 'imageAlt'
      | 'statut'
      | 'aLaUne'
      | 'publieLe'
    >
  > & { modulesLies?: string[] },
): Promise<Article> {
  const colonnes: Record<string, unknown> = {}
  if (champs.titre !== undefined) colonnes.titre = champs.titre
  if (champs.chapo !== undefined) colonnes.chapo = champs.chapo
  if (champs.auteurId !== undefined) colonnes.auteur_id = champs.auteurId
  if (champs.categorie !== undefined) colonnes.categorie = champs.categorie
  if (champs.image !== undefined) colonnes.image = champs.image
  if (champs.imageAlt !== undefined) colonnes.image_alt = champs.imageAlt
  if (champs.aLaUne !== undefined) colonnes.a_la_une = champs.aLaUne
  if (champs.publieLe !== undefined) colonnes.publie_le = champs.publieLe

  // Le temps de lecture se recalcule avec le corps : le laisser figé donnerait
  // une durée fausse dès la première réécriture.
  if (champs.contenu !== undefined) {
    colonnes.contenu = champs.contenu
    colonnes.temps_lecture_minutes = tempsLecture(champs.contenu)
  }

  if (champs.statut !== undefined) {
    colonnes.statut = champs.statut
    if (champs.statut === 'publie') {
      const actuel = verifierOptionnel(
        await supabase().from('articles').select('publie_le').eq('id', id).maybeSingle(),
        'article',
      )
      if (!actuel?.publie_le) colonnes.publie_le = new Date().toISOString().slice(0, 10)
    }
  }

  const row = verifierUn(
    await supabase()
      .from('articles')
      .update(colonnes as never)
      .eq('id', id)
      .select('*')
      .maybeSingle(),
    "mise à jour de l'article",
    'Article introuvable',
  )

  if (champs.modulesLies) {
    await supabase().from('articles_modules').delete().eq('article_id', id)
    if (champs.modulesLies.length) {
      verifier(
        await supabase()
          .from('articles_modules')
          .insert(champs.modulesLies.map((module_id) => ({ article_id: id, module_id })))
          .select('article_id'),
        'modules liés',
      )
    }
  }

  return versArticle(row, champs.modulesLies ?? (await modulesLiesParArticle([id])).get(id) ?? [])
}

/** 220 mots par minute, arrondi au supérieur — la convention retenue pour les
 *  articles d'origine. */
function tempsLecture(contenu: string): number {
  return Math.max(1, Math.ceil(contenu.trim().split(/\s+/).length / 220))
}
