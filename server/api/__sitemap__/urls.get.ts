import { listerArticles } from '../../database/blog'
import { listerFormateurs, listerModules, listerProgrammes } from '../../database/catalogue'
import { listerLiveSessions } from '../../database/live'

/**
 * Spec SEO §8 : le sitemap ne contient que les URL canoniques indexables.
 * Brouillons, fiches « en préparation » non activées et profils incomplets en sortent.
 */
export default defineEventHandler(async () => {
  const [programmes, modules, formateurs, articles, lives] = await Promise.all([
    listerProgrammes(),
    listerModules(),
    listerFormateurs(),
    listerArticles(),
    listerLiveSessions(),
  ])

  return [
    { loc: '/', changefreq: 'weekly', priority: 1 },
    { loc: '/programmes', changefreq: 'weekly', priority: 0.8 },
    ...programmes.map((p) => ({
      loc: `/programmes/${p.slug}`,
      changefreq: 'weekly',
      priority: 0.9,
    })),
    ...modules
      .filter((m) => m.statut === 'disponible' && m.seo.indexable !== false)
      .map((m) => ({ loc: `/modules/${m.slug}`, lastmod: m.majLe, priority: 0.8 })),
    { loc: '/formateurs', priority: 0.6 },
    ...formateurs
      .filter((f) => f.ficheComplete && f.seo.indexable !== false)
      .map((f) => ({ loc: `/formateurs/${f.slug}`, priority: 0.5 })),
    { loc: '/devenir-formateur', priority: 0.5 },
    { loc: '/contact', priority: 0.4 },
    { loc: '/verifier', priority: 0.3 },
    { loc: '/sessions', priority: 0.4 },
    { loc: '/live-sessions', changefreq: 'weekly', priority: 0.7 },
    ...lives
      .filter((l) => l.statut === 'publiee' || l.statut === 'terminee')
      .map((l) => ({ loc: `/live-sessions/${l.slug}`, priority: 0.6 })),
    { loc: '/blog', changefreq: 'weekly', priority: 0.7 },
    ...articles
      .filter((a) => a.statut === 'publie' && a.seo.indexable !== false)
      .map((a) => ({ loc: `/blog/${a.slug}`, lastmod: a.majLe, priority: 0.6 })),
  ]
})
