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

/**
 * Scène du lecteur : c'est elle qui passe en plein écran, et c'est sur elle que
 * les raccourcis clavier sont posés — jamais sur `document`, qui les imposerait
 * au reste de la page.
 */
const scene = ref<HTMLElement | null>(null)

/**
 * La barre de contrôles de la maquette suppose une souris : son rail fait cinq
 * pixels de haut, et le plein écran d'un conteneur n'existe pas sur Safari iOS.
 * Sous cette combinaison, les contrôles natifs du navigateur restent meilleurs
 * — la planche mobile de la maquette ne dessine d'ailleurs aucune barre.
 * Faux au rendu serveur : mieux vaut des contrôles natifs qu'une barre à demi
 * construite le temps de l'hydratation.
 */
const controlesCustom = ref(false)
onMounted(() => {
  const requete = window.matchMedia('(min-width: 1024px) and (pointer: fine)')
  controlesCustom.value = requete.matches
  requete.addEventListener('change', (evenement) => {
    controlesCustom.value = evenement.matches
  })
})

function surClavierScene(evenement: KeyboardEvent) {
  // Une touche destinée à un bouton ou au rail qui a le focus leur appartient.
  const cible = evenement.target as HTMLElement
  if (cible !== scene.value && cible.closest('button,[role="slider"]')) return

  if (evenement.key === ' ' || evenement.key.toLowerCase() === 'k') {
    evenement.preventDefault()
    lecteur.basculerLecture()
  } else if (evenement.key.toLowerCase() === 'f') {
    evenement.preventDefault()
    lecteur.basculerPleinEcran(scene.value)
  } else if (evenement.key === 'ArrowLeft') {
    evenement.preventDefault()
    lecteur.avancerDe(-5)
  } else if (evenement.key === 'ArrowRight') {
    evenement.preventDefault()
    lecteur.avancerDe(5)
  }
}

/** La maquette n'affiche plus l'index des chapitres dans le lecteur : un seul
 *  lien d'enchaînement remplace la rangée de pastilles. */
const chapitreSuivant = computed(() =>
  index.value + 1 < moduleCourant.value.chapitres.length ? moduleCourant.value.chapitres[index.value + 1] : null,
)

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
  <div v-if="data" class="sur-sombre min-h-screen bg-nuit text-white">
    <header class="flex flex-wrap items-center justify-between gap-3 px-5 py-3 lg:px-8 lg:py-[14px]">
      <NuxtLink :to="`/mon-espace/module/${moduleCourant.slug}`" class="text-[13.5px] text-nuit-clair hover:text-white">
        ← Retour au module
      </NuxtLink>
      <!-- `font-sans` est indispensable : la feuille de base impose Jost 300 à
           tous les titres, or la maquette écrit celui-ci en Mulish gras. -->
      <h1 class="font-sans text-[14px] font-bold">
        {{ chapitre?.libelle }} — {{ chapitre?.titre }}
      </h1>
      <p class="text-[12.5px] text-discret">
        <span class="lg:hidden">Ch. {{ index + 1 }} / {{ moduleCourant.chapitres.length }}</span>
        <span class="hidden lg:inline">Chapitre {{ index + 1 }} / {{ moduleCourant.chapitres.length }}</span>
      </p>
    </header>

    <div>
        <!-- Le motif de marque est un fond, pas un voile : la vidéo doit le
             recouvrir. Un élément positionné se peint au-dessus de ceux qui ne
             le sont pas — sans `relative` sur la vidéo, le motif lui passait
             devant et teintait l'image de 14 %. -->
      <div
        ref="scene"
        tabindex="-1"
        class="relative mx-4 aspect-video w-auto overflow-hidden rounded-bloc bg-encre lg:mx-8 lg:aspect-auto lg:h-[560px] [&:fullscreen]:mx-0 [&:fullscreen]:h-full [&:fullscreen]:rounded-none"
        @keydown="surClavierScene"
      >
        <img src="/images/brand/pattern.png" alt="" aria-hidden="true"
          class="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover opacity-[.14]">
        <!-- `object-contain` : la scène de la maquette est un cadre large, pas
             un 16/9 — recadrer y amputerait l'image. -->
        <video v-if="source" ref="video" class="relative z-10 h-full w-full object-contain"
          :controls="!controlesCustom" :tabindex="controlesCustom ? -1 : undefined" controlslist="nodownload" playsinline
          preload="metadata" @play="lecteur.gestionnaires.onPlay" @pause="lecteur.gestionnaires.onPause"
          @ended="lecteur.gestionnaires.onEnded" @timeupdate="lecteur.gestionnaires.onTimeupdate"
          @loadedmetadata="lecteur.gestionnaires.onLoadedmetadata"
          @error="lecteur.gestionnaires.onError"></video>

        <p v-else class="relative z-10 grid h-full place-items-center px-6 text-center text-[13.5px] text-nuit-clair">
          La vidéo de ce chapitre n’est pas encore en ligne. Le script ci-dessous en donne le
          contenu.
        </p>

        <p v-if="lecteur.erreur.value"
          class="absolute inset-x-0 bottom-24 z-30 mx-auto w-fit rounded bg-black/70 px-3 py-2 text-[12.5px] text-white"
          role="status">
          {{ lecteur.erreur.value }}
        </p>

        <!-- Filigrane nominatif : une rediffusion reste attribuable. -->
        <p v-if="source && moduleCourant.filigraneActif"
          class="pointer-events-none absolute top-[22px] right-7 z-20 text-[14px] text-white/20"
          aria-hidden="true">
          {{ auth.utilisateur?.prenom }} {{ auth.utilisateur?.nom }} · {{ auth.utilisateur?.email }}
        </p>

        <EspaceControlesVideo
          v-if="controlesCustom && source"
          v-model:vitesse="lecteur.vitesse.value"
          :position="lecteur.positionSecondes.value"
          :duree="lecteur.dureeSecondes.value || (chapitre?.videoDureeSecondes ?? 0)"
          :en-lecture="lecteur.enLecture.value"
          :qualite="lecteur.qualite.value"
          :vitesses="vitesses"
          :plein-ecran="lecteur.pleinEcran.value"
          @basculer="lecteur.basculerLecture()"
          @seek="lecteur.allerA($event)"
          @plein-ecran="lecteur.basculerPleinEcran(scene)"
        />
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 text-[12px] text-discret-clair lg:px-8">
        <span :title="`Temps réellement visionné : ${horloge(lecteur.secondesVues.value)}`">
          Le temps réel de visionnage est enregistré toutes les 10 s — l’avance rapide ne valide pas
          la progression.
        </span>
        <span>Vitesses : {{ vitesses.map((v) => `${v}×`).join(' · ') }}</span>
      </div>

      <!-- Le script passe sous la vidéo, sur toute la largeur : c'est la
           disposition de la maquette, et elle laisse respirer les passages. -->
      <section class="mx-4 mt-5 mb-8 rounded-bloc bg-encre px-5 py-5 lg:mx-8 lg:px-7 lg:py-6">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 class="font-title text-[17px] font-light text-white">
            <span class="lg:hidden">Script du chapitre</span>
            <span class="hidden lg:inline">Script du chapitre — synchronisé avec la lecture</span>
          </h2>
          <span class="text-[12px] text-discret-clair">Cliquez sur un passage pour y déplacer la vidéo</span>
        </div>

        <ul class="flex flex-col gap-3 text-[14.5px]/[1.65]">
          <li v-for="(ligne, i) in chapitre?.script ?? []" :key="i">
            <!-- Les lignes inactives portent la même bordure et le même retrait,
                 en transparent : sinon le texte sauterait à chaque changement. -->
            <button
              class="flex w-full gap-4 rounded-lg border-l-[3px] px-3.5 py-2.5 text-left transition"
              :class="ligneActive === ligne.temps ? 'border-social bg-social/22 text-white' : 'border-transparent text-discret-clair hover:bg-encre-800'"
              @click="lecteur.allerA(versSecondes(ligne.temps))"
            >
              <span
                class="min-w-[44px] font-mono text-[12px]"
                :class="ligneActive === ligne.temps ? 'text-social-clair' : 'text-discret'"
              >{{ ligne.temps }}</span>
              <span>{{ ligne.texte }}</span>
            </button>
          </li>
        </ul>

        <p v-if="!chapitre?.script?.length" class="text-[13px] text-discret-clair">
          Transcription non encore importée pour ce chapitre.
        </p>
      </section>

      <p v-if="chapitreSuivant" class="mx-4 mb-10 text-right lg:mx-8">
        <button type="button" class="text-[13.5px] font-bold text-social-clair hover:text-white" @click="index += 1">
          {{ chapitreSuivant.libelle }} →
        </button>
      </p>
    </div>
  </div>
</template>
