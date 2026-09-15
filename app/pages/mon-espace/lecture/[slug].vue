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
  chapitres: {
    position: number
    url: string | null
    dureeSecondes: number | null
    format: 'hls' | 'fichier' | null
  }[]
  expireDansSecondes: number
}>(() => `/api/mon-espace/lecture/${route.params.slug}`, { server: false })

const index = ref(Number(route.query.chapitre ?? 0))
const chapitre = computed(() => moduleCourant.value.chapitres[index.value])
const autorisation = computed(() =>
  lecture.value?.chapitres.find((c) => c.position === index.value),
)
const source = computed(() => autorisation.value?.url ?? null)

const lecteur = useLecteurVideo({
  moduleId: () => moduleCourant.value.id,
  position: () => index.value,
  source: () => source.value,
  format: () => autorisation.value?.format ?? null,
})

const video = ref<HTMLVideoElement | null>(null)
watch(video, (element) => lecteur.brancher(element))

// Dernière position, pour « Connexion rétablie — reprise de la lecture à 24:12 » (écran hors ligne).
watch(
  () => Math.floor(lecteur.positionSecondes.value / 5),
  () => {
    try {
      localStorage.setItem(
        'emc-derniere-lecture',
        JSON.stringify({ slug: moduleCourant.value.slug, chapitre: index.value, secondes: lecteur.positionSecondes.value }),
      )
    } catch {
      /* stockage indisponible */
    }
  },
)

// « Reprendre » depuis la page module : la vidéo repart au temps déjà vu.
const reprise = Number(route.query.reprise ?? 0)
if (reprise > 0) {
  const arreter = watch(lecteur.dureeSecondes, (duree) => {
    if (duree > 0) {
      lecteur.allerA(Math.min(reprise, duree - 1))
      arreter()
    }
  })
}
// Changer de chapitre recharge le flux : même lecteur, autre source. Un
// renouvellement d'autorisation change aussi `source` : c'est ce qui relance la
// lecture après une expiration, sans second appel à `charger()`.
watch([index, source], () => lecteur.charger())

/** Un seul renouvellement par chapitre : si l'autorisation fraîche est refusée
 *  à son tour, on s'arrête là plutôt que de boucler entre le renouvellement et
 *  le diffuseur. Remis à zéro au changement de chapitre. */
let renouvellementTente = false
watch(index, () => {
  renouvellementTente = false
})

const vitesses = [0.75, 1, 1.25, 1.5, 2]
const vitesse = ref(1)
watch(vitesse, (valeur) => lecteur.vitesse(valeur))

function horloge(secondes: number): string {
  const total = Math.max(0, Math.floor(secondes))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** « 04:30 » d'une ligne de script, en secondes. */
/**
 * Timecode d'un passage vers des secondes.
 *
 * Le format écrit est « mm:ss », les minutes débordant au-delà de soixante —
 * « 73:20 » pour une heure treize. Trois segments sont acceptés en assurance :
 * une transcription saisie à la main dans l'autre forme ne produirait plus un
 * saut au début de la vidéo.
 */
function versSecondes(temps: string): number {
  const parties = temps.split(':').map(Number)
  if (parties.length === 3) {
    const [heures, minutes, secondes] = parties
    return (heures ?? 0) * 3600 + (minutes ?? 0) * 60 + (secondes ?? 0)
  }
  const [minutes, secondes] = parties
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

/**
 * Une autorisation expirée en cours de session se renouvelle sans quitter la
 * page : l'apprenant ne voit qu'une reprise de lecture.
 *
 * Seulement celle-là. Renouveler sur n'importe quelle erreur enfermait la page
 * dans une boucle : le refus déclenchait un renouvellement, la nouvelle URL
 * relançait la lecture par le veilleur ci-dessus, le diffuseur refusait encore
 * — des dizaines de requêtes par minute, derrière un message d'erreur déjà
 * affiché. Une signature que le diffuseur n'accepte pas ne s'arrange pas en la
 * redemandant.
 */
watch(lecteur.erreur, async (message) => {
  if (!message || !lecteur.erreurRenouvelable.value || renouvellementTente) return
  renouvellementTente = true
  await renouvelerAutorisations()
})

/**
 * Renouvellement préventif, cinq minutes avant l'échéance.
 *
 * Attendre le refus suffisait tant que le lecteur chargeait un manifeste au
 * démarrage. Un fichier unique, lui, redemande des plages pendant toute la
 * lecture : un chapitre de quarante minutes suivi avec des pauses dépasse
 * volontiers les quatre heures d'autorisation, et le refus tombe alors en
 * plein visionnage. La source est remplacée en gardant la place — changer le
 * `src` d'une balise vidéo remet sinon le curseur à zéro.
 */
const MARGE_RENOUVELLEMENT_SECONDES = 5 * 60
let minuteurAutorisation: ReturnType<typeof setTimeout> | undefined

function programmerRenouvellement() {
  if (minuteurAutorisation) clearTimeout(minuteurAutorisation)
  const validite = lecture.value?.expireDansSecondes
  if (!validite) return
  const delai = Math.max(60, validite - MARGE_RENOUVELLEMENT_SECONDES) * 1000
  minuteurAutorisation = setTimeout(async () => {
    await renouvelerAutorisations()
    lecteur.rechargerEnPlace()
    programmerRenouvellement()
  }, delai)
}

watch(lecture, programmerRenouvellement, { immediate: true })
onBeforeUnmount(() => minuteurAutorisation && clearTimeout(minuteurAutorisation))
</script>

<template>
  <div v-if="data" class="sur-sombre min-h-screen bg-encre text-white">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-encre-800 px-6 py-4">
      <NuxtLink :to="`/mon-espace/module/${moduleCourant.slug}`" class="text-[13.5px] text-[#b9b4c4] hover:text-white">
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
          <img src="/images/brand/pattern.png" alt="" aria-hidden="true"
            class="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[.14]">
          <video v-if="source" ref="video" class="h-full w-full" controls controlslist="nodownload" playsinline
            preload="metadata" @play="lecteur.gestionnaires.onPlay" @pause="lecteur.gestionnaires.onPause"
            @ended="lecteur.gestionnaires.onEnded" @timeupdate="lecteur.gestionnaires.onTimeupdate"
            @loadedmetadata="lecteur.gestionnaires.onLoadedmetadata"
            @error="lecteur.gestionnaires.onError"></video>

          <p v-else class="relative grid h-full place-items-center px-6 text-center text-[13.5px] text-[#b9b4c4]">
            La vidéo de ce chapitre n’est pas encore en ligne. Le script ci-contre en donne le
            contenu.
          </p>

          <p v-if="lecteur.erreur.value"
            class="absolute inset-x-0 bottom-14 mx-auto w-fit rounded bg-black/70 px-3 py-2 text-[12.5px] text-white"
            role="status">
            {{ lecteur.erreur.value }}
          </p>

          <!-- Filigrane nominatif : une rediffusion reste attribuable. -->
          <p v-if="source"
            class="pointer-events-none absolute top-4 right-4 rounded bg-black/40 px-2 py-1 text-[11px] text-white/70"
            aria-hidden="true">
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
            <select v-model.number="vitesse" class="rounded border border-encre-800 bg-encre-800 px-2 py-1 text-white">
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
          <button v-for="(c, i) in moduleCourant.chapitres" :key="i"
            class="rounded-full border px-3.5 py-2 text-[12.5px]"
            :class="i === index ? 'border-social bg-social text-white' : 'border-encre-800 text-[#b9b4c4]'"
            @click="index = i">
            {{ c.libelle }}
          </button>
        </nav>
      </div>

      <aside class="rounded-carte bg-encre-800 p-5">
        <h2 class="font-title text-[17px] text-social-clair font-light mb-5">Script du chapitre</h2>
        <hr class="border-encre-700 mb-5">
        <p class="mt-1 text-[12px] text-[#8f8a9c]">
          Synchronisé avec la lecture — cliquez sur un passage pour y déplacer la vidéo.
        </p>

        <ul class="mt-4 space-y-3">
          <li v-for="(ligne, i) in chapitre?.script ?? []" :key="i">
            <button class="w-full rounded-[10px] p-3 text-left text-[13.5px] transition hover:bg-encre"
              :class="ligneActive === ligne.temps ? 'bg-encre' : ''" @click="lecteur.allerA(versSecondes(ligne.temps))">
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
