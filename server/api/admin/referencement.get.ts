import { compterErreurs404, lireReglagesSeo, listerRedirections } from '../../database/administration'
import { CHEMINS_PRIORITAIRES, detecterDoublons, inventaireReferencement } from '../../utils/seo'
import { exigerUneSection } from '../../utils/session'
import urlsSitemap from '../__sitemap__/urls.get'

export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUneSection(event, ['referencement-contenu', 'modules-chapitres', 'blog'])
  const [entrees, redirections, reglagesSeo, sitemap, erreurs404] = await Promise.all([
    inventaireReferencement(),
    listerRedirections(),
    lireReglagesSeo(),
    // Le même inventaire que celui servi à /sitemap.xml : le compte affiché
    // est celui que Google reçoit.
    urlsSitemap(event),
    compterErreurs404(30),
  ])

  return {
    entrees,
    doublons: detecterDoublons(entrees),
    // Spec §3 : Title et Meta description obligatoires sur les pages prioritaires.
    manquants: entrees
      .filter((e) => CHEMINS_PRIORITAIRES.includes(e.chemin))
      .filter((e) => !e.seo.title || !e.seo.metaDescription)
      .map((e) => e.chemin),
    redirections,

    /**
     * État technique (écran 23).
     *
     * Ce que l'application maîtrise est affirmé ; ce qui dépend d'un compte
     * chez Google est lu dans les réglages, sans faire comme si c'était réglé.
     */
    technique: {
      sitemap: { chemin: '/sitemap.xml', urls: sitemap.length },
      robots: { chemin: '/robots.txt', sitemapDeclare: true },
      // Les pages privées ne sont ni dans le plan de site ni indexables : la
      // règle est portée par la configuration, pas par une case à cocher.
      pagesExclues: entrees.filter((e) => e.seo.indexable === false).length,
      redirections: redirections.length,
      // « Connectée » dès qu'un jeton de vérification est renseigné.
      searchConsole: reglagesSeo.googleSearchConsole.trim() ? 'Connectée' : 'À connecter',
      // Chemins distincts ayant répondu 404 sur trente jours, relevés par le
      // greffon `server/plugins/erreurs404.ts`.
      erreurs404,
    },

    // Le front masque les champs réservés en fonction de ce rôle (spec §13).
    role: utilisateur.role,
  }
})
