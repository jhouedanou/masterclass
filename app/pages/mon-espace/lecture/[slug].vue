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

/**
 * Autorisations de lecture : une URL signée par chapitre, valable quelques
 * heures. Elles sont demandées à part du module pour ne pas être mises en
 * cache avec lui — une URL périmée doit pouvoir être renouvelée seule.
 */
const { data: lecture, refresh: renouvelerAutorisations } = await useFetch<{
  chapitres: { position: number; url: string | null; dureeSecondes: number | null }[]
}>(() => `/api/mon-espace/lecture/${route.params.slug}`, { server: false })

const index = ref(Number(route.query.chapitre ?? 0))
const chapitre = computed(() => moduleCourant.value.chapitres[index.value])
const source = computed(
  () => lecture.value?.chapitres.find((c) => c.position === index.value)?.url ?? null,
)

const lecteur = useLecteurVideo({
  moduleId: () => moduleCourant.value.id,
  position: () => index.value,
  source: () => source.value,
})

const video = ref<HTMLVideoElement | null>(null)
watch(video, (element) => lecteur.brancher(element))
// Changer de chapitre recharge le flux : même lecteur, autre source.
watch([index, source], () => lecteur.charger())

const vitesses = [0.75, 1, 1.25, 1.5, 2]
const vitesse = ref(1)
watch(vitesse, (valeur) => lecteur.vitesse(valeur))

function horloge(secondes: number): string {
  const total = Math.max(0, Math.floor(secondes))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** « 04:30 » d'une ligne de script, en secondes. */
function versSecondes(temps: string): number {
  const [minutes, secondes] = temps.split(':').map(Number)
  return (minutes ?? 0) * 60 + (secondes ?? 0)
}

/** Ligne de script en cours : la dernière dont l'horodatage est dépassé. */
const ligneActive = computed(() => {
  const lignes = chapitre.value?.script ?? []
  let active = ''
  for (const ligne of lignes) {
    if (versSecondes(ligne.temps) <= lecteur.positionSecondes.value) active = ligne.temps
  }
  return active
})

const progressionAffichee = computed(
  () => lecteur.progression.value ?? data.value?.acces.progression ?? 0,
)

// Une autorisation expirée en cours de session se renouvelle sans quitter la
// page : l'apprenant ne voit qu'une reprise de lecture.
watch(lecteur.erreur, async (message) => {
  if (message) {
    await renouvelerAutorisations()
    lecteur.charger()
  }
})
</script>

<template>
  <div v-if="data" class="sur-sombre min-h-screen bg-encre text-white">
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
        <div class="relative aspect-16/9 w-full overflow-hidden rounded-carte bg-black">
          <img
            src="/images/brand/pattern.png"
            alt=""
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[.14]"
          >
          <video
            v-if="source"
            ref="video"
            class="h-full w-full"
            controls
            controlslist="nodownload"
            playsinline
            preload="metadata"
            @play="lecteur.gestionnaires.onPlay"
            @pause="lecteur.gestionnaires.onPause"
            @ended="lecteur.gestionnaires.onEnded"
            @timeupdate="lecteur.gestionnaires.onTimeupdate"
            @loadedmetadata="lecteur.gestionnaires.onLoadedmetadata"
          ></video>

          <p v-else class="relative grid h-full place-items-center px-6 text-center text-[13.5px] text-[#b9b4c4]">
            La vidéo de ce chapitre n’est pas encore en ligne. Le script ci-contre en donne le
            contenu.
          </p>

          <p
            v-if="lecteur.erreur.value"
            class="absolute inset-x-0 bottom-14 mx-auto w-fit rounded bg-black/70 px-3 py-2 text-[12.5px] text-white"
            role="status"
          >
            {{ lecteur.erreur.value }}
          </p>

          <!-- Filigrane nominatif : une rediffusion reste attribuable. -->
          <p
            v-if="source"
            class="pointer-events-none absolute top-4 right-4 rounded bg-black/40 px-2 py-1 text-[11px] text-white/70"
            aria-hidden="true"
          >
            {{ auth.utilisateur?.prenom }} {{ auth.utilisateur?.nom }} · {{ auth.utilisateur?.email }}
          </p>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-4 text-[13px] text-[#b9b4c4]">
          <span>
            {{ horloge(lecteur.positionSecondes.value) }} /
            {{ horloge(lecteur.dureeSecondes.value || (chapitre?.videoDureeSecondes ?? 0)) }}
          </span>
          <label class="flex items-center gap-2">
            Vitesse
            <select
              v-model.number="vitesse"
              class="rounded border border-encre-800 bg-encre-800 px-2 py-1 text-white"
            >
              <option v-for="v in vitesses" :key="v" :value="v">{{ v }}×</option>
            </select>
          </label>
          <span>Qualité adaptée automatiquement</span>
          <span class="ml-auto">Progression du module : {{ progressionAffichee }} %</span>
        </div>

        <p class="mt-3 text-[12px] text-[#8f8a9c]">
          Temps réellement visionné : {{ horloge(lecteur.secondesVues.value) }} — relevé toutes les
          dix secondes. L’avance rapide ne valide pas la progression.
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
              :class="ligneActive === ligne.temps ? 'bg-encre' : ''"
              @click="lecteur.allerA(versSecondes(ligne.temps))"
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
