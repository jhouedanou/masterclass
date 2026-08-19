<script setup lang="ts">
import type { Article, Formateur } from '#shared/types'

const { data: articles } = await useFetch<(Article & { auteur: Formateur | null })[]>('/api/articles')

const categorie = ref('')
const categories = ['Social Média', 'Entrepreneuriat', 'Actualités E-Masterclass Big Five']

const filtres = computed(() =>
  (articles.value ?? []).filter((a) => !categorie.value || a.categorie === categorie.value),
)
const une = computed(() => filtres.value.find((a) => a.aLaUne) ?? filtres.value[0])
const recents = computed(() => filtres.value.filter((a) => a.id !== une.value?.id))

usePageSeo({
  titreAuto: 'Le blog E-Masterclass Big Five',
  descriptionAuto:
    'Des conseils, méthodes et analyses pour aider les professionnels du Social Media et les entrepreneurs à actualiser leurs pratiques.',
  // Le filtre par catégorie ne change pas l'URL : /blog reste la seule page
  // indexable. Si des URL filtrées sont un jour exposées, les passer en noindex.
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
            Tout
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
          <NuxtLink :to="`/blog/${une.slug}`" class="block overflow-hidden rounded-[12px] bg-fond-voile">
            <NuxtImg
              :src="une.image"
              :alt="une.imageAlt"
              width="720"
              height="405"
              class="aspect-16/9 w-full object-cover"
            />
          </NuxtLink>
          <div class="flex flex-col justify-center">
            <p class="surtitre text-social">À la une · {{ une.categorie }}</p>
            <h2 class="mt-3 font-title text-[32px] leading-[1.15] font-light">
              <NuxtLink :to="`/blog/${une.slug}`" class="text-encre hover:underline">
                {{ une.titre }}
              </NuxtLink>
            </h2>
            <p class="mt-3 text-[15.5px] leading-relaxed text-texte">{{ une.chapo }}</p>
            <p class="mt-4 text-[13px] text-discret">
              {{ une.auteur?.nom }} · {{ formatDate(une.publieLe) }} ·
              {{ une.tempsLectureMinutes }} min de lecture
            </p>
          </div>
        </article>

        <h2 class="mt-12 font-title text-[27px] font-light">Articles récents</h2>
        <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <CatalogueArticleCarte v-for="article in recents" :key="article.id" :article="article" />
        </div>
      </div>
    </section>

    <section class="border-t border-ligne-claire bg-fond-clair py-14">
      <div class="conteneur text-center">
        <h2 class="font-title text-[27px] font-light">Envie d’approfondir cette compétence ?</h2>
        <UiBaseButton to="/programmes/social-media" class="mt-6" variante="sombre">
          Découvrir les programmes E-Masterclass Big Five
        </UiBaseButton>
      </div>
    </section>
  </div>
</template>
