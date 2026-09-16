<script setup lang="ts">
import { rendreTexteRiche } from '#shared/utils/texteRiche'
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
const { data: formateurs } = await useFetch<{ id: string; nom: string }[]>('/api/formateurs')
/** « Coury Othniel · 10 000 FCFA TTC » sous chaque module lié (planche A, écran 13). */
const formateurDe = (m: { formateurId: string }) => {
  const nom = formateurs.value?.find((f) => f.id === m.formateurId)?.nom
  return nom ? `${nom} · ` : ''
}
const url = computed(() => `${config.public.siteUrl}/blog/${article.value.slug}`)

usePageSeo({
  titreAuto: `${article.value.titre} | E-Masterclass Big Five`,
  descriptionAuto: article.value.chapo,
  imageAuto: article.value.image,
  seo: article.value.seo,
})

const mailles = computed(() => [
  { libelle: 'Blog', chemin: '/blog' },
  { libelle: article.value.categorie, chemin: '/blog' },
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

/**
 * Rendu du corps de l'article.
 *
 * Le contenu neuf vient de l'éditeur du back-office et a été assaini à
 * l'écriture ; le contenu hérité, rédigé en Markdown allégé, est échappé puis
 * balisé. `rendreTexteRiche` tranche entre les deux — voir
 * `shared/utils/texteRiche.ts`.
 */
const html = computed(() => rendreTexteRiche(article.value.contenu))
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
        <span v-if="data.auteur">{{ data.auteur.nom }} · </span>
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
        <h2 class="font-title text-[21px] font-light">Modules liés à cet article</h2>
        <ul class="mt-4 divide-y divide-ligne-claire">
          <li v-for="m in data.modulesLies" :key="m.id" class="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p class="text-[11.5px] font-bold tracking-[0.1em] uppercase" :class="m.programme === 'social-media' ? 'text-social' : 'text-entrepreneurs'">
                Module {{ numeroModule(m.numero) }}
              </p>
              <NuxtLink :to="`/modules/${m.slug}`" class="font-title text-[19px] font-light text-encre hover:underline">{{ m.titre }}</NuxtLink>
              <p class="text-[13px] text-discret">{{ formateurDe(m) }}{{ formatFcfa(m.prixFcfa) }} TTC</p>
            </div>
            <UiBaseButton :to="`/modules/${m.slug}`" taille="sm" variante="contour">Voir le module</UiBaseButton>
          </li>
        </ul>
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

    <section class="border-t border-ligne-claire py-14">
      <div class="conteneur text-center">
        <h2 class="font-title text-[27px] font-light">Envie d’approfondir cette compétence ?</h2>
        <p class="mt-3 text-[15.5px] text-texte">Chaque module se choisit à l’unité, selon votre besoin du moment.</p>
        <UiBaseButton :to="`/programmes/${article.categorie === 'Entrepreneuriat' ? 'entrepreneurs' : 'social-media'}`" class="mt-6" variante="sombre">
          Découvrir les programmes
        </UiBaseButton>
      </div>
    </section>
  </div>
</template>
