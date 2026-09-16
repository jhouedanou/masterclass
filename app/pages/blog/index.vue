<script setup lang="ts">
import type { Article, Formateur } from '#shared/types'

type ArticleListe = Article & { auteur: Formateur | null }

const categorie = ref('')
const page = ref(1)
const categories = ['Social Média', 'Entrepreneuriat', 'Actualités E-Masterclass Big Five']

/** Étiquette de catégorie : la maquette la teinte du programme qu'elle sert. */
const PASTILLE = 'rounded-full px-3 py-[5px] text-[11.5px] font-bold'
function teintePastille(cat: string) {
  if (cat === 'Social Média') return 'bg-social-voile text-social'
  if (cat === 'Entrepreneuriat') return 'bg-entrepreneurs-voile text-entrepreneurs'
  return 'bg-fond-voile text-texte'
}

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
    <div class="conteneur pt-12 pb-8">
      <UiSurtitre ton="discret" taille="section">Ressources et conseils</UiSurtitre>
      <h1 class="mt-2.5 mb-3 font-title text-[40px] font-light">Le blog E-Masterclass Big Five</h1>
      <p class="mb-6.5 max-w-[760px] text-[16px] leading-relaxed text-texte">
        Des conseils, méthodes et analyses pour aider les professionnels du Social Media et les
        entrepreneurs à actualiser leurs pratiques.
      </p>

      <!-- Le filtre retenu se remplit d'encre ; les autres restent en contour. -->
      <div class="flex flex-wrap gap-3" role="group" aria-label="Filtrer par catégorie">
        <button
          class="rounded-full px-5 py-2.5 text-[14px]"
          :class="!categorie ? 'bg-encre font-bold text-white' : 'border-[1.5px] border-ligne font-semibold text-texte'"
          :aria-pressed="!categorie"
          @click="categorie = ''"
        >
          Tous les articles
        </button>
        <button
          v-for="cat in categories"
          :key="cat"
          class="rounded-full px-5 py-2.5 text-[14px]"
          :class="categorie === cat ? 'bg-encre font-bold text-white' : 'border-[1.5px] border-ligne font-semibold text-texte'"
          :aria-pressed="categorie === cat"
          @click="categorie = cat"
        >
          {{ cat }}
        </button>
      </div>
    </div>

    <div class="conteneur pb-10">
      <article v-if="une" class="grid overflow-hidden rounded-[18px] border border-ligne-douce lg:grid-cols-[1.15fr_1fr]">
        <NuxtLink :to="`/blog/${une.slug}`" class="block min-h-[320px] bg-fond-voile" tabindex="-1" aria-hidden="true">
          <NuxtImg
            :src="une.image"
            :alt="une.imageAlt"
            width="720"
            height="405"
            class="size-full object-cover"
          />
        </NuxtLink>
        <div class="flex flex-col justify-center p-9 lg:pl-1">
          <p class="mb-3 flex items-center gap-2.5">
            <span :class="[PASTILLE, teintePastille(une.categorie)]">{{ une.categorie }}</span>
            <span class="text-[12.5px] text-discret">À la une</span>
          </p>
          <h2 class="mb-3 font-title text-[30px] leading-[1.2] font-light text-pretty">
            <NuxtLink :to="`/blog/${une.slug}`" class="text-encre hover:underline">
              {{ une.titre }}
            </NuxtLink>
          </h2>
          <p class="mb-4.5 text-[15px] leading-[1.65] text-texte">{{ une.chapo }}</p>
          <p class="mb-5 text-[13px] text-discret">
            {{ une.auteur?.nom }} · {{ formatDate(une.publieLe) }} ·
            {{ une.tempsLectureMinutes }} min de lecture
          </p>
          <UiBaseButton :to="`/blog/${une.slug}`" class="self-start" variante="sombre" taille="sm">
            Lire l’article
          </UiBaseButton>
        </div>
      </article>

      <div class="mt-6.5 grid gap-5.5 sm:grid-cols-2 lg:grid-cols-3">
        <CatalogueArticleCarte v-for="article in autres" :key="article.id" :article="article" />
      </div>
      <p v-if="!articles.length" class="mt-8 text-[15px] text-discret">Aucun article dans cette catégorie pour le moment.</p>

      <!-- Pagination en pavés carrés, comme la maquette, et non en pastilles rondes. -->
      <nav v-if="pages.length > 1" aria-label="Pagination" class="mt-7.5 flex items-center justify-center gap-2 text-[14px] font-bold">
        <button
          type="button"
          class="rounded-[10px] border-[1.5px] border-ligne px-3.5 py-2.25 text-texte disabled:text-inactif"
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
          class="rounded-[10px] px-3.75 py-2.25"
          :class="p === page ? 'bg-encre text-white' : 'border-[1.5px] border-ligne text-texte hover:bg-fond-clair'"
          :aria-current="p === page ? 'page' : undefined"
          @click="allerPage(p)"
        >
          {{ p }}
        </button>
        <button
          type="button"
          class="rounded-[10px] border-[1.5px] border-ligne px-3.5 py-2.25 text-texte disabled:text-inactif"
          :disabled="page >= pages.length"
          aria-label="Page suivante"
          @click="allerPage(page + 1)"
        >
          →
        </button>
      </nav>
    </div>

    <section class="sur-sombre bg-encre py-11 text-white">
      <div class="conteneur flex flex-wrap items-center justify-between gap-8">
        <div>
          <h2 class="mb-2 font-title text-[28px] font-light">Envie d’approfondir cette compétence ?</h2>
          <p class="text-[15px] leading-relaxed text-nuit-clair">
            Chaque module se choisit à l’unité, selon votre besoin du moment.
          </p>
        </div>
        <UiBaseButton to="/programmes/social-media" variante="blanc" class="whitespace-nowrap">
          Découvrir les programmes E-Masterclass Big Five
        </UiBaseButton>
      </div>
    </section>
  </div>
</template>
