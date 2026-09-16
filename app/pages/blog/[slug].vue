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

/** La catégorie se porte en pastille, teintée du programme qu'elle sert. */
const teintePastille = computed(() => {
  if (article.value.categorie === 'Social Média') return 'bg-social-voile text-social'
  if (article.value.categorie === 'Entrepreneuriat') return 'bg-entrepreneurs-voile text-entrepreneurs'
  return 'bg-fond-voile text-texte'
})
const PARTAGE = 'rounded-full border-[1.5px] border-ligne px-4.5 py-2.25 text-texte hover:bg-fond-clair'

usePageSeo({
  titreAuto: `${article.value.titre} | E-Masterclass Big Five`,
  descriptionAuto: article.value.chapo,
  imageAuto: article.value.image,
  seo: article.value.seo,
  type: 'article',
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
  <div v-if="data" class="conteneur grid items-start gap-14 pt-11 pb-14 lg:grid-cols-[1fr_340px]">
    <article>
      <FilAriane class="mb-4" :mailles="mailles" />

      <p class="mb-3.5">
        <span class="rounded-full px-3 py-[5px] text-[11.5px] font-bold" :class="teintePastille">
          {{ article.categorie }}
        </span>
      </p>
      <h1 class="mb-3.5 font-title text-[40px] leading-[1.15] font-light text-pretty">{{ article.titre }}</h1>
      <p class="mb-4.5 text-[18px] leading-relaxed font-semibold text-encre">{{ article.chapo }}</p>

      <!-- Signature entre deux filets : c'est la césure entre le chapô et le corps. -->
      <div class="mb-6.5 flex items-center gap-3 border-y border-ligne-claire py-3.5 text-[13.5px]">
        <NuxtImg
          v-if="data.auteur"
          :src="data.auteur.photo"
          :alt="data.auteur.photoAlt || `Portrait de ${data.auteur.nom}`"
          width="42"
          height="42"
          loading="lazy"
          class="size-[42px] rounded-full bg-fond-voile object-cover"
        />
        <div>
          <b v-if="data.auteur">{{ data.auteur.nom }}</b>
          <p class="text-discret">
            <time :datetime="article.publieLe ?? undefined">{{ formatDate(article.publieLe) }}</time>
            · {{ article.tempsLectureMinutes }} min de lecture
          </p>
        </div>
      </div>

      <NuxtImg
        :src="article.image"
        :alt="article.imageAlt"
        width="960"
        height="540"
        class="mb-7.5 h-[340px] w-full rounded-carte bg-fond-voile object-cover"
      />

      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="editorial" v-html="html" />

      <div v-if="data.modulesLies.length" class="mt-7 rounded-carte border border-ligne-douce p-6">
        <h2 class="mb-3.5 text-[11.5px] font-bold tracking-[0.14em] text-discret uppercase">
          Modules liés à cet article
        </h2>
        <div class="grid gap-3.5 sm:grid-cols-2">
          <NuxtLink
            v-for="m in data.modulesLies"
            :key="m.id"
            :to="`/modules/${m.slug}`"
            class="flex flex-col gap-1.5 rounded-[12px] border border-ligne-douce p-4 text-encre hover:bg-fond-clair"
          >
            <span class="text-[11.5px] font-bold tracking-[0.1em] uppercase" :class="m.programme === 'social-media' ? 'text-social' : 'text-entrepreneurs'">
              Module {{ numeroModule(m.numero) }}
            </span>
            <span class="font-title text-[17px] font-light">{{ m.titre }}</span>
            <span class="text-[12.5px] text-discret">{{ formateurDe(m) }}{{ formatFcfa(m.prixFcfa, true) }}</span>
          </NuxtLink>
        </div>
      </div>

      <div class="mt-7 flex flex-wrap items-center gap-3 text-[13px] font-bold">
        <span class="text-texte">Partager :</span>
        <a
          :href="lienWhatsApp(`${article.titre} — ${url}`)"
          target="_blank"
          rel="noopener"
          class="rounded-full border-[1.5px] border-whatsapp px-4.5 py-2.25 text-whatsapp hover:bg-succes-voile"
        >
          WhatsApp
        </a>
        <a
          :href="`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`"
          target="_blank"
          rel="noopener"
          :class="PARTAGE"
        >
          Facebook
        </a>
        <a
          :href="`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`"
          target="_blank"
          rel="noopener"
          :class="PARTAGE"
        >
          LinkedIn
        </a>
      </div>
    </article>

    <!-- Colonne collante : articles associés puis appel aux programmes. -->
    <aside class="flex flex-col gap-4.5 lg:sticky lg:top-6">
      <div v-if="data.associes.length" class="rounded-carte border border-ligne-tendre p-5.5">
        <h2 class="mb-3.5 text-[11.5px] font-bold tracking-[0.14em] text-discret uppercase">
          Articles associés
        </h2>
        <div class="flex flex-col gap-3.5">
          <NuxtLink
            v-for="a in data.associes"
            :key="a.id"
            :to="`/blog/${a.slug}`"
            class="flex items-start gap-3 text-encre"
          >
            <NuxtImg
              :src="a.image"
              :alt="a.imageAlt"
              width="64"
              height="64"
              loading="lazy"
              class="size-16 shrink-0 rounded-[10px] bg-fond-voile object-cover"
            />
            <span>
              <span class="block text-[14px] leading-[1.35] font-semibold hover:underline">{{ a.titre }}</span>
              <span class="text-[12.5px] text-discret">{{ a.tempsLectureMinutes }} min de lecture</span>
            </span>
          </NuxtLink>
        </div>
      </div>

      <div class="sur-sombre rounded-carte bg-encre p-6 text-white">
        <p class="mb-2.5 font-title text-[20px] leading-[1.3] font-light">
          Envie d’approfondir cette compétence ?
        </p>
        <p class="mb-4 text-[13.5px] leading-relaxed text-nuit-clair">
          Chaque module se choisit à l’unité, selon votre besoin du moment.
        </p>
        <UiBaseButton
          :to="`/programmes/${article.categorie === 'Entrepreneuriat' ? 'entrepreneurs' : 'social-media'}`"
          class="w-full"
          variante="blanc"
          taille="sm"
        >
          Découvrir les programmes
        </UiBaseButton>
      </div>
    </aside>
  </div>
</template>
