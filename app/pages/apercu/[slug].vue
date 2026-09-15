<script setup lang="ts">
import type { Formateur, Module, RessourceModule, Thematique } from '#shared/types'

/**
 * Prévisualisation d'un module — écran 10.
 *
 * Sans gabarit : la page rend ce que l'apprenant verra, encadré d'un bandeau
 * qui rappelle en permanence qu'il ne s'agit pas de la page publiée. Le
 * bandeau vit ici et non dans l'iframe parente, pour qu'il suive le lien
 * envoyé à un formateur en relecture.
 */
definePageMeta({ layout: false })

const route = useRoute()
const { data, error } = await useFetch<{
  module: Module
  thematique: Thematique | null
  formateur: Formateur | null
  ressources: RessourceModule[]
  statut: string
  pretLe: string | null
}>(() => `/apercu/${route.params.slug}`, {
  baseURL: '/api',
  query: { e: route.query.e, jeton: route.query.jeton },
})

if (!data.value) {
  throw createError({
    statusCode: error.value?.statusCode ?? 404,
    statusMessage: error.value?.statusMessage ?? 'Prévisualisation indisponible',
    fatal: true,
  })
}

// Trois protections plutôt qu'une : le robots.txt n'est pas un substitut à la
// balise, et la balise ne remplace pas l'absence du plan de site.
usePagePrivee(`Prévisualisation — ${data.value.module.titre}`)

const LIBELLE_STATUT: Record<string, string> = {
  disponible: 'Vente ouverte',
  'en-preparation': 'En préparation',
  brouillon: 'Brouillon',
  annonce: 'Annonce',
}

const moduleCourant = computed(() => data.value!.module)
const chapitres = computed(() => moduleCourant.value.chapitres)
const dureeTotale = computed(() =>
  Math.round(chapitres.value.reduce((s, c) => s + (c.videoDureeSecondes ?? 0), 0) / 60),
)
</script>

<template>
  <div v-if="data" class="min-h-screen bg-fond">
    <!-- Affiché en permanence : c'est ce que demande la maquette, et c'est ce
         qui évite qu'une capture de cette page soit prise pour la vraie. -->
    <div class="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-2 bg-[#a06a12] px-5 py-2.5 text-white">
      <p class="text-[12.5px] font-bold tracking-[0.08em] uppercase">
        Prévisualisation — non publié
      </p>
      <p class="text-[12.5px]">
        {{ LIBELLE_STATUT[data.statut] ?? data.statut }}
        <template v-if="data.pretLe"> · Prêt le {{ formatDate(data.pretLe) }}</template>
      </p>
    </div>

    <main class="mx-auto max-w-[900px] px-5 py-8">
      <p class="surtitre text-social">
        {{ moduleCourant.programme === 'social-media' ? 'Social Média' : 'Entrepreneurs' }} ·
        {{ data.thematique?.nom }} · Module {{ numeroModule(moduleCourant.numero) }}
      </p>
      <h1 class="mt-2 font-title text-[32px] font-light">{{ moduleCourant.titre }}</h1>
      <p class="mt-2 text-[15px] text-texte">{{ moduleCourant.promesse }}</p>

      <div class="mt-6 rounded-[14px] border border-ligne-douce bg-white p-6">
        <h2 class="font-title text-[19px] font-light">Le programme du module</h2>
        <ul class="mt-3 flex flex-col gap-2">
          <li
            v-for="(c, i) in chapitres"
            :key="i"
            class="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border p-3 text-[14px]"
            :class="c.videoCle ? 'border-ligne-claire' : 'border-dashed border-ligne text-discret'"
          >
            <span>{{ c.libelle }} · {{ c.titre }}</span>
            <span class="text-[12.5px] text-discret">
              <template v-if="c.videoDureeSecondes">{{ Math.round(c.videoDureeSecondes / 60) }} min</template>
              <template v-else>à venir</template>
              <template v-if="c.script?.length"> · script ✓</template>
            </span>
          </li>
        </ul>
        <p class="mt-3 text-[12.5px] text-discret">
          {{ chapitres.length }} chapitre{{ chapitres.length > 1 ? 's' : '' }} ·
          {{ dureeTotale }} min de vidéo déposée sur {{ moduleCourant.dureeMinutes }} annoncées
        </p>
      </div>

      <div v-if="moduleCourant.pointsForts.length" class="mt-5 rounded-[14px] border border-ligne-douce bg-white p-6">
        <h2 class="font-title text-[19px] font-light">Les points forts du module</h2>
        <ul class="mt-3 ml-4 list-disc text-[14px] text-texte">
          <li v-for="(point, i) in moduleCourant.pointsForts" :key="i" class="mt-1">{{ point }}</li>
        </ul>
      </div>

      <div v-if="data.ressources.length" class="mt-5 rounded-[14px] border border-ligne-douce bg-white p-6">
        <h2 class="font-title text-[19px] font-light">Ressources du module</h2>
        <ul class="mt-3 flex flex-col gap-1.5 text-[14px]">
          <li v-for="r in data.ressources" :key="r.id" class="text-texte">
            {{ r.titre }} <span class="text-discret">· {{ r.format }}</span>
          </li>
        </ul>
      </div>

      <div class="mt-5 rounded-[14px] border border-ligne-douce bg-white p-6">
        <h2 class="font-title text-[19px] font-light">Votre formateur</h2>
        <p class="mt-2 text-[14px] text-texte">
          <b>{{ data.formateur?.nom }}</b> — {{ data.formateur?.expertise }}
        </p>
      </div>
    </main>
  </div>
</template>
