/** Injecte un bloc JSON-LD arbitraire (Course, Person, Article — spec SEO §9). */
export function useJsonLd(donnees: MaybeRefOrGetter<Record<string, unknown>>) {
  useHead({
    script: [
      {
        type: 'application/ld+json',
        innerHTML: computed(() =>
          JSON.stringify({ '@context': 'https://schema.org', ...toValue(donnees) }),
        ),
      },
    ],
  })
}
