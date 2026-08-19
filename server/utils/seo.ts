import type { SeoFields } from '#shared/types'
import { articles, formateurs, modules, programmes, reglagesSeo } from '../data/db'

/** Valeurs automatiques appliquées quand un champ n'est pas personnalisé (spec SEO §4). */
export function resoudreSeo(
  seo: SeoFields | undefined,
  auto: { title: string; description: string; image?: string; chemin: string },
) {
  const title = seo?.title?.trim() || auto.title
  const description = seo?.metaDescription?.trim() || auto.description
  const image = seo?.ogImage || auto.image || reglagesSeo.imageSocialeParDefaut
  return {
    title,
    description,
    ogTitle: seo?.ogTitle?.trim() || title,
    ogDescription: seo?.ogDescription?.trim() || description,
    ogImage: image,
    canonical: seo?.canonical?.trim() || auto.chemin,
    indexable: seo?.indexable !== false,
  }
}

export interface EntreeReferencement {
  id: string
  type: 'accueil' | 'programme' | 'module' | 'formateur' | 'editoriale' | 'article'
  libelle: string
  chemin: string
  statut: string
  seo: SeoFields
  /** Champs réservés à l'administrateur supérieur. */
  slugVerrouille: boolean
}

/** Inventaire de toutes les pages pilotables depuis l'onglet « Référencement et partage ». */
export function inventaireReferencement(): EntreeReferencement[] {
  const entrees: EntreeReferencement[] = [
    {
      id: 'page-accueil',
      type: 'accueil',
      libelle: 'Accueil',
      chemin: '/',
      statut: 'publie',
      seo: {
        title: reglagesSeo.titreParDefaut,
        metaDescription: reglagesSeo.descriptionParDefaut,
        indexable: true,
      },
      slugVerrouille: true,
    },
    ...programmes.map<EntreeReferencement>((p) => ({
      id: p.id,
      type: 'programme',
      libelle: `Programme ${p.nom}`,
      chemin: `/programmes/${p.slug}`,
      statut: 'publie',
      seo: p.seo,
      slugVerrouille: true,
    })),
    ...modules.map<EntreeReferencement>((m) => ({
      id: m.id,
      type: 'module',
      libelle: m.titre,
      chemin: `/modules/${m.slug}`,
      statut: m.statut,
      seo: m.seo,
      slugVerrouille: false,
    })),
    ...formateurs.map<EntreeReferencement>((f) => ({
      id: f.id,
      type: 'formateur',
      libelle: f.nom,
      chemin: `/formateurs/${f.slug}`,
      statut: f.ficheComplete ? 'publie' : 'brouillon',
      seo: f.seo,
      slugVerrouille: false,
    })),
    ...['formateurs', 'devenir-formateur', 'contact', 'faq', 'blog'].map<EntreeReferencement>(
      (chemin) => ({
        id: `page-${chemin}`,
        type: 'editoriale',
        libelle: chemin,
        chemin: `/${chemin}`,
        statut: 'publie',
        seo: { indexable: true },
        slugVerrouille: true,
      }),
    ),
    ...articles.map<EntreeReferencement>((a) => ({
      id: a.id,
      type: 'article',
      libelle: a.titre,
      chemin: `/blog/${a.slug}`,
      statut: a.statut,
      seo: a.seo,
      slugVerrouille: false,
    })),
  ]
  return entrees
}

/** Détection des Title / Meta description dupliqués (spec SEO §3, validation). */
export function detecterDoublons(entrees: EntreeReferencement[]) {
  const compteur = (cle: 'title' | 'metaDescription') => {
    const carte = new Map<string, string[]>()
    for (const e of entrees) {
      const valeur = e.seo?.[cle]?.trim()
      if (!valeur) continue
      carte.set(valeur, [...(carte.get(valeur) ?? []), e.chemin])
    }
    return [...carte.entries()]
      .filter(([, chemins]) => chemins.length > 1)
      .map(([valeur, chemins]) => ({ valeur, chemins }))
  }
  return { titles: compteur('title'), descriptions: compteur('metaDescription') }
}

/** Pages prioritaires : Title et Meta description obligatoires avant publication. */
export const CHEMINS_PRIORITAIRES = ['/', '/programmes/social-media', '/programmes/entrepreneurs']
