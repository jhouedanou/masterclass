import type { SeoFields } from '#shared/types'

interface OptionsSeo {
  /**
   * Valeurs automatiques appliquées quand le champ back-office est vide
   * (spec SEO §4). Elles acceptent un getter ou une ref : une description qui
   * annonce un décompte — « 8 modules de 60 minutes » — ne peut pas être
   * calculée avant que le catalogue soit chargé.
   */
  titreAuto: MaybeRefOrGetter<string>
  descriptionAuto: MaybeRefOrGetter<string>
  imageAuto?: string
  seo?: SeoFields
  /** Chemin canonique de la page ; par défaut la route courante. */
  chemin?: string
  /** `article` sur une page de blog, `website` partout ailleurs. */
  type?: 'website' | 'article'
}

/**
 * Pose Title, Meta description, Open Graph, canonical et robots pour une page
 * publique, en respectant la hiérarchie « champ personnalisé > valeur automatique ».
 */
export function usePageSeo(options: OptionsSeo) {
  const route = useRoute()
  const config = useRuntimeConfig()
  const base = config.public.siteUrl

  const title = computed(() => options.seo?.title?.trim() || toValue(options.titreAuto))
  const description = computed(
    () => options.seo?.metaDescription?.trim() || toValue(options.descriptionAuto),
  )
  // WhatsApp, Facebook et LinkedIn ne lisent pas le SVG en `og:image` : une
  // page sans image propre se partageait sans vignette.
  const image = options.seo?.ogImage || options.imageAuto || '/images/og-default.png'
  const chemin = options.chemin ?? route.path
  const canonical = options.seo?.canonical?.trim() || `${base}${chemin === '/' ? '' : chemin}`
  const indexable = options.seo?.indexable !== false

  useSeoMeta({
    title,
    description,
    ogTitle: computed(() => options.seo?.ogTitle?.trim() || title.value),
    ogDescription: computed(() => options.seo?.ogDescription?.trim() || description.value),
    ogImage: image.startsWith('http') ? image : `${base}${image}`,
    // Le back-office réclame du 1200 × 630 (planche C, écran 24) : l'annoncer
    // décide WhatsApp et LinkedIn entre grande vignette et miniature.
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageAlt: title,
    ogUrl: canonical,
    ogType: options.type ?? 'website',
    ogLocale: 'fr_FR',
    ogSiteName: 'E-Masterclass Big Five',
    twitterCard: 'summary_large_image',
    // Aucune balise meta keywords n'est générée (spec SEO §14).
    robots: indexable ? 'index, follow' : 'noindex, nofollow',
  })

  useHead({
    link: [{ rel: 'canonical', href: canonical }],
  })

  return { title, description, canonical, indexable }
}

/** Pages privées : noindex systématique (spec SEO §2). */
export function usePagePrivee(titre: string) {
  useSeoMeta({
    title: `${titre} | E-Masterclass Big Five`,
    robots: 'noindex, nofollow',
  })
}
