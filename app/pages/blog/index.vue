<script setup lang="ts">
import type { Article, Formateur } from '#shared/types'

type ArticleListe = Article & { auteur: Formateur | null }

const categorie = ref('')
const page = ref(1)
const categories = ['Social Média', 'Entrepreneuriat', 'Actualités E-Masterclass Big Five']

const { data } = await useFetch<{ articles: ArticleListe[]; page: number; totalPages: number; total: number }>(
  '/api/articles',
  { query: computed(() => ({ page: page.value, categorie: categorie.value || undefined })) },
)

watch(categorie, () => (page.value = 1))

const articles = computed(() => data.value?.articles ?? [])
/** L'article à la une n'est mis en avant qu'en tête de la première page. */
const une = computed(() => (page.value === 1 ? articles.value.find((a) => a.aLaUne) ?? articles.value[0] : undefined))
const autres = computed(() => articles.value.filter((a) => a.id !== une.value?.id))
const pages = computed(() => Array.from({ length: data.value?.totalPages ?? 1 }, (_, i) => i + 1))

function allerPage(p: number) {
  page.value = Math.min(Math.max(1, p), data.value?.totalPages ?? 1)
  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}

usePageSeo({
  titreAuto: 'Le blog E-Masterclass Big Five',
  descriptionAuto:
    'Des conseils, méthodes et analyses pour aider les professionnels du Social Media et les entrepreneurs à actualiser leurs pratiques.',
  // Le filtre par catégorie et la pagination ne changent pas l'URL : /blog
  // reste la seule page indexable.
  chemin: '/blog',
})

const mailles = [{ libelle: 'Accueil', chemin: '/' }, { libelle: 'Blog' }]
useFilAriane(mailles)
</script>

<template>
  <div>
    <section class="rayures-social border-b border-ligne-claire">
      <div class="conteneur py-12">
        <FilAriane :mailles="mailles" class="mb-6" />
        <UiSurtitre ton="social">Ressources et conseils</UiSurtitre>
        <h1 class="mt-3 text-[42px] font-medium">Le blog E-Masterclass Big Five</h1>
        <p class="mt-4 max-w-[760px] text-[17px] leading-relaxed text-texte">
          Des conseils, méthodes et analyses pour aider les professionnels du Social Media et les
          entrepreneurs à actualiser leurs pratiques.
        </p>
      </div>
    </section>

    <section class="py-12">
      <div class="conteneur">
        <div class="flex flex-wrap gap-2" role="group" aria-label="Filtrer par catégorie">
          <button
            class="rounded-full border px-4.5 py-2.5 text-[14px] font-bold"
            :class="!categorie ? 'border-social bg-social text-white' : 'border-ligne text-texte'"
            :aria-pressed="!categorie"
            @click="categorie = ''"
          >
            Tous les articles
          </button>
          <button
            v-for="cat in categories"
            :key="cat"
            class="rounded-full border px-4.5 py-2.5 text-[14px] font-bold"
            :class="categorie === cat ? 'border-social bg-social text-white' : 'border-ligne text-texte'"
            :aria-pressed="categorie === cat"
            @click="categorie = cat"
          >
            {{ cat }}
          </button>
        </div>

        <article v-if="une" class="mt-8 grid gap-8 rounded-carte border border-ligne-douce p-6 lg:grid-cols-2">
          <NuxtLink :to="`/blog/${une.slug}`" class="block overflow-hidden rounded-[12px] bg-fond-voile" tabindex="-1" aria-hidden="true">
            <NuxtImg
              :src="une.image"
              :alt="une.imageAlt"
              width="720"
              height="405"
              class="aspect-16/9 w-full object-cover"
            />
          </NuxtLink>
          <div class="flex flex-col justify-center">
            <p class="flex flex-wrap gap-2">
              <span class="rounded-full bg-fond-voile px-3 py-1 text-[12px] font-bold tracking-[0.08em] text-social uppercase">{{ une.categorie }}</span>
              <span class="rounded-full bg-social px-3 py-1 text-[12px] font-bold tracking-[0.08em] text-white uppercase">À la une</span>
            </p>
            <h2 class="mt-4 font-title text-[32px] leading-[1.15] font-light">
              <NuxtLink :to="`/blog/${une.slug}`" class="text-encre hover:underline">
                {{ une.titre }}
              </NuxtLink>
            </h2>
            <p class="mt-3 text-[15.5px] leading-relaxed text-texte">{{ une.chapo }}</p>
            <p class="mt-4 text-[13px] text-discret">
              {{ une.auteur?.nom }} · {{ formatDate(une.publieLe) }} ·
              {{ une.tempsLectureMinutes }} min de lecture
            </p>
            <UiBaseButton :to="`/blog/${une.slug}`" class="mt-5 self-start" variante="sombre">Lire l’article</UiBaseButton>
          </div>
        </article>

        <div class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <CatalogueArticleCarte v-for="article in autres" :key="article.id" :article="article" />
        </div>
        <p v-if="!articles.length" class="mt-8 text-[15px] text-discret">Aucun article dans cette catégorie pour le moment.</p>

        <nav v-if="pages.length > 1" aria-label="Pagination" class="mt-10 flex items-center justify-center gap-1.5 text-[14px]">
          <button
            type="button"
            class="grid size-10 place-items-center rounded-full border border-ligne text-encre disabled:opacity-40"
            :disabled="page <= 1"
            aria-label="Page précédente"
            @click="allerPage(page - 1)"
          >
            ←
          </button>
          <button
            v-for="p in pages"
            :key="p"
            type="button"
            class="grid size-10 place-items-center rounded-full border font-bold"
            :class="p === page ? 'border-social bg-social text-white' : 'border-ligne text-texte hover:bg-fond-clair'"
            :aria-current="p === page ? 'page' : undefined"
            @click="allerPage(p)"
          >
            {{ p }}
          </button>
          <button
            type="button"
            class="grid size-10 place-items-center rounded-full border border-ligne text-encre disabled:opacity-40"
            :disabled="page >= pages.length"
            aria-label="Page suivante"
            @click="allerPage(page + 1)"
          >
            →
          </button>
        </nav>
      </div>
    </section>

    <section class="border-t border-ligne-claire bg-fond-clair py-14">
      <div class="conteneur text-center">
        <h2 class="font-title text-[27px] font-light">Envie d’approfondir cette compétence ?</h2>
        <p class="mt-3 text-[15.5px] text-texte">Chaque module se choisit à l’unité, selon votre besoin du moment.</p>
        <UiBaseButton to="/programmes/social-media" class="mt-6" variante="sombre">
          Découvrir les programmes E-Masterclass Big Five
        </UiBaseButton>
      </div>
    </section>
  </div>
</template>
