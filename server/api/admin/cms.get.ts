import { listerBlocsVitrine, listerTemoignages, listerVersions } from '../../database/backoffice'
import { listerArticles } from '../../database/blog'
import { exigerSection } from '../../utils/session'

/** CMS du site vitrine (planche C, écran 15). */
export default defineEventHandler(async (event) => {
  await exigerSection(event, 'cms-site-vitrine')
  const [blocs, temoignages, versions, articles] = await Promise.all([
    listerBlocsVitrine(),
    listerTemoignages(),
    // L'historique est restaurable en un clic : chaque enregistrement y dépose
    // l'état précédent, autant le montrer là où l'on édite.
    listerVersions('blocs_vitrine', undefined, 40),
    listerArticles(),
  ])
  // La ligne « Blog — 14 articles, 3 catégories » de l'écran 15 : un renvoi
  // vers la section dédiée, pas un bloc éditable ici.
  const blog = {
    articles: articles.length,
    categories: new Set(articles.map((a) => a.categorie)).size,
  }
  return { blocs, temoignages, versions, blog }
})
