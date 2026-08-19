<script setup lang="ts">
import type { Article, Formateur, Module } from '#shared/types'

const route = useRoute()
const config = useRuntimeConfig()

const { data } = await useFetch<{
  article: Article
  auteur: Formateur | null
  modulesLies: Module[]
  associes: Article[]
}>(() => `/api/articles/${route.params.slug}`)

if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Article introuvable', fatal: true })
}

const article = computed(() => data.value!.article)
const url = computed(() => `${config.public.siteUrl}/blog/${article.value.slug}`)

usePageSeo({
  titreAuto: `${article.value.titre} | E-Masterclass Big Five`,
  descriptionAuto: article.value.chapo,
  imageAuto: article.value.image,
  seo: article.value.seo,
})

const mailles = computed(() => [
  { libelle: 'Accueil', chemin: '/' },
  { libelle: 'Blog', chemin: '/blog' },
  { libelle: article.value.titre },
])
useFilAriane(mailles)

useJsonLd(() => ({
  '@type': 'Article',
  headline: article.value.titre,
  description: article.value.chapo,
  image: `${config.public.siteUrl}${article.value.image}`,
  datePublished: article.value.publieLe,
  dateModified: article.value.majLe,
  author: data.value?.auteur
    ? { '@type': 'Person', name: data.value.auteur.nom }
    : { '@type': 'Organization', name: 'E-Masterclass Big Five' },
  publisher: { '@type': 'Organization', name: 'E-Masterclass Big Five' },
}))

/** Rendu léger du contenu éditorial (titres, listes, paragraphes). */
const html = computed(() =>
  article.value.contenu
    .split('\n\n')
    .map((bloc) => {
      const t = bloc.trim()
      if (t.startsWith('### ')) return `<h3>${t.slice(4)}</h3>`
      if (t.startsWith('## ')) return `<h2>${t.slice(3)}</h2>`
      if (/^\d+\.\s/.test(t)) {
        const items = t
          .split('\n')
          .map((l) => `<li>${l.replace(/^\d+\.\s/, '')}</li>`)
          .join('')
        return `<ol class="my-4 list-decimal space-y-1.5 pl-6 text-[15.5px] text-texte">${items}</ol>`
      }
      return `<p>${t}</p>`
    })
    .join(''),
)
</script>

<template>
  <div v-if="data">
    <div class="conteneur pt-6">
      <FilAriane :mailles="mailles" />
    </div>

    <article class="conteneur max-w-[760px] pt-6 pb-14">
      <p class="surtitre text-social">{{ article.categorie }}</p>
      <h1 class="mt-3 text-[38px] leading-[1.15] font-medium">{{ article.titre }}</h1>
      <p class="mt-4 text-[19px] leading-relaxed text-texte">{{ article.chapo }}</p>

      <p class="mt-5 text-[13px] text-discret">
        <span v-if="data.auteur">Par {{ data.auteur.nom }} · </span>
        <time :datetime="article.publieLe ?? undefined">{{ formatDate(article.publieLe) }}</time>
        · {{ article.tempsLectureMinutes }} min de lecture
      </p>

      <NuxtImg
        :src="article.image"
        :alt="article.imageAlt"
        width="960"
        height="540"
        class="mt-8 aspect-16/9 w-full rounded-carte bg-fond-voile object-cover"
      />

      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="editorial mt-8" v-html="html" />

      <div v-if="data.modulesLies.length" class="mt-10 rounded-carte border border-ligne-douce bg-fond-clair p-6">
        <h2 class="font-title text-[21px] font-light">Le module qui va plus loin</h2>
        <div class="mt-4 grid gap-5.5 sm:grid-cols-2">
          <CatalogueModuleCarte v-for="m in data.modulesLies" :key="m.id" :module="m" />
        </div>
      </div>

      <div class="mt-8 flex flex-wrap items-center gap-3 border-t border-ligne-claire pt-6 text-[13.5px]">
        <span class="text-discret">Partager :</span>
        <a
          :href="lienWhatsApp(`${article.titre} — ${url}`)"
          target="_blank"
          rel="noopener"
          class="rounded-full border border-ligne px-4 py-2 text-encre hover:bg-fond-clair"
        >
          WhatsApp
        </a>
        <a
          :href="`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`"
          target="_blank"
          rel="noopener"
          class="rounded-full border border-ligne px-4 py-2 text-encre hover:bg-fond-clair"
        >
          Facebook
        </a>
        <a
          :href="`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`"
          target="_blank"
          rel="noopener"
          class="rounded-full border border-ligne px-4 py-2 text-encre hover:bg-fond-clair"
        >
          LinkedIn
        </a>
      </div>
    </article>

    <section v-if="data.associes.length" class="border-t border-ligne-claire bg-fond-clair py-14">
      <div class="conteneur">
        <h2 class="font-title text-[27px] font-light">Articles associés</h2>
        <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <CatalogueArticleCarte v-for="a in data.associes" :key="a.id" :article="a" />
        </div>
      </div>
    </section>
  </div>
</template>
