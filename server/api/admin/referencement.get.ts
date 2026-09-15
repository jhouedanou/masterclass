import { listerRedirections } from '../../database/administration'
import { CHEMINS_PRIORITAIRES, detecterDoublons, inventaireReferencement } from '../../utils/seo'
import { exigerAdmin } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const utilisateur = await exigerAdmin(event)
  const [entrees, redirections] = await Promise.all([
    inventaireReferencement(),
    listerRedirections(),
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
     * chez Google est laissé à vérifier, sans faire comme si c'était réglé.
     */
    technique: {
      sitemap: { chemin: '/sitemap.xml', automatique: true },
      robots: { chemin: '/robots.txt', automatique: true },
      // Les pages privées ne sont ni dans le plan de site ni indexables : la
      // règle est portée par la configuration, pas par une case à cocher.
      pagesExclues: entrees.filter((e) => e.seo.indexable === false).length,
      redirections: redirections.length,
      // Le compte Search Console ne se vérifie pas d'ici : on rappelle où il
      // se renseigne plutôt que d'annoncer un état qu'on ignore.
      searchConsole: null,
    },

    // Le front masque les champs réservés en fonction de ce rôle (spec §13).
    role: utilisateur.role,
  }
})
