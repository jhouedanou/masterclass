<script setup lang="ts">
import type { Acces, Formateur, Module, Programme, Thematique } from '#shared/types'

definePageMeta({ layout: false, middleware: 'auth' })

const route = useRoute()
const auth = useAuthStore()

const { data, error } = await useFetch<{
  module: Module
  acces: Acces
  formateur: Formateur | null
  thematique: Thematique | null
  programme: Programme | null
}>(() => `/api/mon-espace/module/${route.params.slug}`)

if (!data.value) {
  throw createError({
    statusCode: error.value?.statusCode ?? 404,
    statusMessage: error.value?.statusMessage ?? 'Module introuvable',
    fatal: true,
  })
}

const moduleCourant = computed(() => data.value!.module)
usePagePrivee(`Lecture — ${moduleCourant.value.titre}`)

const index = ref(Number(route.query.chapitre ?? 0))
const chapitre = computed(() => moduleCourant.value.chapitres[index.value])
const position = ref('00:00')

const vitesses = ['0.75', '1', '1.25', '1.5', '2']
const vitesse = ref('1')
</script>

<template>
  <div v-if="data" class="min-h-screen bg-encre text-white">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-encre-800 px-6 py-4">
      <NuxtLink
        :to="`/mon-espace/module/${moduleCourant.slug}`"
        class="text-[13.5px] text-[#b9b4c4] hover:text-white"
      >
        ← Retour au module
      </NuxtLink>
      <p class="font-title text-[17px] font-light">
        {{ chapitre?.libelle }} — {{ chapitre?.titre }}
      </p>
      <p class="text-[13px] text-[#8f8a9c]">
        Chapitre {{ index + 1 }} / {{ moduleCourant.chapitres.length }}
      </p>
    </header>

    <div class="grid gap-6 p-6 xl:grid-cols-[1.6fr_1fr]">
      <div>
        <div class="relative grid aspect-16/9 w-full place-items-center rounded-carte bg-black">
          <p class="px-6 text-center text-[13.5px] text-[#8f8a9c]">
            Flux vidéo à brancher — streaming adaptatif HLS, URL signée.
          </p>
          <!-- Watermark nominatif : dissuade la rediffusion du contenu. -->
          <p
            class="pointer-events-none absolute right-4 bottom-4 rounded bg-black/40 px-2 py-1 text-[11px] text-white/70"
            aria-hidden="true"
          >
            {{ auth.utilisateur?.prenom }} {{ auth.utilisateur?.nom }} · {{ auth.utilisateur?.email }}
          </p>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-4 text-[13px] text-[#b9b4c4]">
          <span>{{ position }} / {{ chapitre?.dureeMinutes ?? 0 }}:00</span>
          <label class="flex items-center gap-2">
            Vitesse
            <select v-model="vitesse" class="rounded border border-encre-800 bg-encre-800 px-2 py-1 text-white">
              <option v-for="v in vitesses" :key="v" :value="v">{{ v }}×</option>
            </select>
          </label>
          <span>Auto 480p</span>
        </div>

        <p class="mt-3 text-[12px] text-[#8f8a9c]">
          Le temps réel de visionnage sera enregistré toutes les 10 secondes : l’avance rapide ne
          valide pas la progression.
        </p>

        <nav aria-label="Chapitres" class="mt-6 flex flex-wrap gap-2">
          <button
            v-for="(c, i) in moduleCourant.chapitres"
            :key="i"
            class="rounded-full border px-3.5 py-2 text-[12.5px]"
            :class="i === index ? 'border-social bg-social text-white' : 'border-encre-800 text-[#b9b4c4]'"
            @click="index = i"
          >
            {{ c.libelle }}
          </button>
        </nav>
      </div>

      <aside class="rounded-carte bg-encre-800 p-5">
        <h2 class="font-title text-[17px] font-light">Script du chapitre</h2>
        <p class="mt-1 text-[12px] text-[#8f8a9c]">
          Synchronisé avec la lecture — cliquez sur un passage pour y déplacer la vidéo.
        </p>

        <ul class="mt-4 space-y-3">
          <li v-for="ligne in chapitre?.script ?? []" :key="ligne.temps">
            <button
              class="w-full rounded-[10px] p-3 text-left text-[13.5px] transition hover:bg-encre"
              :class="position === ligne.temps ? 'bg-encre' : ''"
              @click="position = ligne.temps"
            >
              <span class="block font-mono text-[11.5px] text-social-clair">{{ ligne.temps }}</span>
              <span class="mt-1 block text-[#b9b4c4]">{{ ligne.texte }}</span>
            </button>
          </li>
        </ul>

        <p v-if="!chapitre?.script?.length" class="mt-4 text-[13px] text-[#8f8a9c]">
          Transcription non encore importée pour ce chapitre.
        </p>
      </aside>
    </div>
  </div>
</template>
