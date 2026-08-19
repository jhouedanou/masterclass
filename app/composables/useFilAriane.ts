export interface MailleAriane {
  libelle: string
  chemin?: string
}

/**
 * Fil d'Ariane visible + BreadcrumbList JSON-LD (spec SEO §7 et §9).
 * Les données structurées reprennent exactement les libellés affichés.
 */
export function useFilAriane(mailles: MaybeRefOrGetter<MailleAriane[]>) {
  const config = useRuntimeConfig()
  const liste = computed(() => toValue(mailles))

  useHead({
    script: [
      {
        type: 'application/ld+json',
        innerHTML: computed(() =>
          JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: liste.value.map((m, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: m.libelle,
              ...(m.chemin ? { item: `${config.public.siteUrl}${m.chemin}` } : {}),
            })),
          }),
        ),
      },
    ],
  })

  return liste
}
