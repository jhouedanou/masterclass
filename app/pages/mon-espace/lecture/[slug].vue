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
  /** Avancement chapitre par chapitre. La route le rendait déjà — la page de
   *  lecture était seule à ne pas s'en servir, et son sommaire n'affichait
   *  donc que des durées, là où la fiche du module montre l'avancement. */
  chapitres: {
    position: number
    etat: 'vu' | 'en-cours' | 'a-voir'
    pourcentage: number
  }[]
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
  surFin: () => terminerChapitre(),
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

const chapitreSuivant = computed(() =>
  index.value + 1 < moduleCourant.value.chapitres.length ? moduleCourant.value.chapitres[index.value + 1] : null,
)

// --- Enchaînement automatique ------------------------------------------------

/**
 * Dix secondes entre deux chapitres.
 *
 * Assez pour lire le titre qui suit et décider, assez peu pour que suivre un
 * module d'une traite ne demande pas un clic tous les quarts d'heure. Le
 * décompte s'annule au moindre signe de désaccord — un clic sur « Rester »,
 * une relecture, un changement de chapitre — parce qu'enchaîner malgré
 * l'apprenant serait pire que ne rien enchaîner du tout.
 */
const SECONDES_ENCHAINEMENT = 10
const resteAvantSuivant = ref<number | null>(null)
let minuteurEnchainement: ReturnType<typeof setInterval> | undefined

/**
 * Enchaîner est le comportement attendu d'un lecteur de cours : c'est le
 * réglage par défaut, et le refus seul se retient. « Rester sur ce chapitre »
 * ne valait que pour un chapitre — refusé trois fois de suite, l'enchaînement
 * était en fait refusé tout court.
 */
const CLE_ENCHAINEMENT = 'emc-enchainement'
const enchainementActif = ref(true)
onMounted(() => {
  try {
    enchainementActif.value = localStorage.getItem(CLE_ENCHAINEMENT) !== 'non'
  } catch {
    /* stockage indisponible : on enchaîne, comme par défaut */
  }
})

function reglerEnchainement(actif: boolean) {
  enchainementActif.value = actif
  if (!actif) annulerEnchainement()
  try {
    localStorage.setItem(CLE_ENCHAINEMENT, actif ? 'oui' : 'non')
  } catch {
    /* stockage indisponible : le choix ne vaut que pour cette session */
  }
}

/** Vrai quand le module vient d'être terminé — dernier chapitre allé au bout. */
const moduleTermine = ref(false)

/**
 * Fin d'un chapitre : le suivant s'enchaîne, ou le module se clôt.
 *
 * Sur le dernier chapitre, `lancerEnchainement` retournait sans rien faire et
 * l'apprenant restait devant une image arrêtée. C'est pourtant le moment le
 * plus utile du parcours : celui où l'on propose l'attestation et la suite.
 */
function terminerChapitre() {
  if (!chapitreSuivant.value) {
    moduleTermine.value = true
    return
  }
  if (!enchainementActif.value) return
  lancerEnchainement()
}

function annulerEnchainement() {
  if (minuteurEnchainement) clearInterval(minuteurEnchainement)
  minuteurEnchainement = undefined
  resteAvantSuivant.value = null
}

function lancerEnchainement() {
  if (!chapitreSuivant.value) return
  annulerEnchainement()
  resteAvantSuivant.value = SECONDES_ENCHAINEMENT
  minuteurEnchainement = setInterval(() => {
    if (resteAvantSuivant.value === null) return
    resteAvantSuivant.value -= 1
    if (resteAvantSuivant.value <= 0) {
      annulerEnchainement()
      allerAuChapitre(index.value + 1, { lire: true })
    }
  }, 1000)
}

onBeforeUnmount(annulerEnchainement)

// --- Sommaire en surimpression ----------------------------------------------

/** Le sommaire par-dessus la vidéo, comme le fait Udemy : on change de
 *  chapitre sans quitter le lecteur ni perdre le plein écran. */
const sommaireOuvert = ref(false)

/**
 * Ouvre un chapitre, en disant s'il doit démarrer seul.
 *
 * `lire` est un paramètre et non une déduction : c'est le même geste qui sert à
 * l'enchaînement, au sommaire et au lien de bas de page, et laisser le
 * comportement dépendre du contexte d'appel finirait par surprendre. Le
 * sommaire lance la lecture lui aussi — on est dans un lecteur, y choisir un
 * chapitre veut dire le regarder.
 */
function allerAuChapitre(nouvel: number, options?: { lire?: boolean }) {
  if (nouvel < 0 || nouvel >= moduleCourant.value.chapitres.length) return
  annulerEnchainement()
  moduleTermine.value = false
  sommaireOuvert.value = false
  if (options?.lire) lecteur.lireDesQuePret()
  index.value = nouvel
}

// Changer de chapitre par un autre chemin coupe aussi le décompte.
watch(index, annulerEnchainement)

/**
 * Avancement d'un chapitre, tel que le sommaire l'affiche.
 *
 * Les valeurs viennent du serveur, sauf pour le chapitre en cours : celui-là se
 * recalcule à la volée sur le cumul du lecteur. Sans cela, la pastille du
 * chapitre qu'on est en train de regarder resterait figée sur ce qu'elle valait
 * à l'ouverture de la page, ce qui est précisément le seul endroit où
 * l'apprenant s'attend à la voir bouger.
 *
 * Le seuil de 95 % est celui du serveur (`listerVisionnagesModule`) et celui de
 * la base : une seconde manque toujours à l'appel en fin de vidéo, le relevé
 * partant en secondes entières.
 */
type Avancement = { etat: 'vu' | 'en-cours' | 'a-voir'; pourcentage: number }

const avancements = computed<Avancement[]>(() =>
  moduleCourant.value.chapitres.map((_, position) => {
    const serveur = data.value?.chapitres.find((c) => c.position === position)
    const repli: Avancement = serveur
      ? { etat: serveur.etat, pourcentage: serveur.pourcentage }
      : { etat: 'a-voir', pourcentage: 0 }

    if (position !== index.value) return repli

    const duree = lecteur.dureeSecondes.value || (chapitre.value?.videoDureeSecondes ?? 0)
    if (!duree) return repli

    // Le cumul du lecteur ne peut que dépasser celui du serveur, jamais le
    // contredire : la base ne retient que la plus grande valeur.
    const vues = Math.max(lecteur.secondesVues.value, (repli.pourcentage / 100) * duree)
    const part = Math.min(100, Math.round((vues / duree) * 100))

    if (repli.etat === 'vu' || vues >= duree * 0.95) return { etat: 'vu', pourcentage: 100 }
    return { etat: part > 0 ? 'en-cours' : 'a-voir', pourcentage: part }
  }),
)

/** Durée d'un chapitre, telle qu'annoncée : le sommaire doit se lire avant
 *  d'ouvrir la vidéo, donc sans attendre ses métadonnées. */
function dureeChapitre(c: { videoDureeSecondes?: number | null; dureeMinutes?: number | null }): string {
  const secondes = c.videoDureeSecondes ?? (c.dureeMinutes ?? 0) * 60
  return secondes ? horloge(secondes) : '—'
}

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
        <!-- `contextmenu` bloqué : le menu du clic droit de Chrome propose
             « Enregistrer la vidéo sous… », qui télécharge le fichier servi.
             `controlslist` retire l'entrée équivalente des contrôles natifs, et
             `disablepictureinpicture` la fenêtre détachée, d'où l'on
             enregistrait tout aussi bien.

             Aucun de ces réglages n'est une protection : l'URL signée reste
             lisible dans les outils de développement pendant ses quatre heures
             de validité, et rien n'empêche un enregistrement d'écran. Ils
             écartent le geste facile ; c'est le filigrane nominatif qui rend
             une rediffusion attribuable. -->
        <video v-if="source" ref="video" class="relative z-10 h-full w-full object-contain"
          :controls="!controlesCustom" :tabindex="controlesCustom ? -1 : undefined"
          controlslist="nodownload noplaybackrate noremoteplayback" disablepictureinpicture disableremoteplayback
          playsinline @contextmenu.prevent
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

        <!-- Sommaire, par-dessus la vidéo. Le bouton se retire pendant le
             décompte : deux propositions concurrentes au même endroit, et
             l'apprenant ne sait plus laquelle l'emporte. -->
        <button
          v-if="source && !resteAvantSuivant"
          type="button"
          class="absolute top-[18px] left-5 z-40 flex items-center gap-2 rounded-full bg-black/55 px-3.5 py-2 text-[12.5px] font-bold text-white backdrop-blur transition hover:bg-black/75"
          :aria-expanded="sommaireOuvert"
          @click="sommaireOuvert = !sommaireOuvert"
        >
          <Icon name="ph:list" class="size-4" />
          {{ sommaireOuvert ? 'Fermer' : 'Chapitres' }}
        </button>

        <div
          v-if="sommaireOuvert && source"
          class="absolute inset-y-0 left-0 z-30 flex w-[min(340px,86%)] flex-col bg-encre/95 backdrop-blur"
        >
          <p class="shrink-0 px-5 pt-[68px] pb-3 text-[12px] font-bold tracking-wide text-discret-clair uppercase">
            {{ moduleCourant.chapitres.length }} chapitres
          </p>
          <ul class="min-h-0 flex-1 overflow-y-auto px-3 pb-5">
            <li v-for="(c, i) in moduleCourant.chapitres" :key="c.libelle + i">
              <button
                type="button"
                class="flex w-full items-baseline gap-3 rounded-lg border-l-[3px] px-3 py-2.5 text-left transition"
                :class="i === index
                  ? 'border-social bg-social/22 text-white'
                  : 'border-transparent text-discret-clair hover:bg-encre-800'"
                :aria-current="i === index ? 'true' : undefined"
                @click="allerAuChapitre(i, { lire: true })"
              >
                <!-- Le numéro cède la place à l'avancement dès qu'il y en a
                     un : c'est la convention de la fiche du module, et le
                     numéro se lit de toute façon dans l'ordre de la liste. -->
                <span
                  class="min-w-[26px] shrink-0 font-mono text-[12px]"
                  :class="avancements[i]!.etat === 'vu'
                    ? 'text-succes'
                    : i === index ? 'text-social-clair' : 'text-discret'"
                >
                  <template v-if="avancements[i]!.etat === 'vu'">✓</template>
                  <template v-else-if="avancements[i]!.etat === 'en-cours'">{{ avancements[i]!.pourcentage }}%</template>
                  <template v-else>{{ i + 1 }}</template>
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block text-[13.5px] font-bold">{{ c.libelle }}</span>
                  <span class="block truncate text-[12.5px] font-normal opacity-80">{{ c.titre }}</span>
                  <!-- Un filet fin plutôt qu'un second chiffre : le sommaire se
                       parcourt d'un coup d'œil par-dessus la vidéo. -->
                  <span
                    v-if="avancements[i]!.etat !== 'a-voir'"
                    class="mt-1.5 block h-[3px] overflow-hidden rounded-full bg-white/15"
                    aria-hidden="true"
                  >
                    <span
                      class="block h-full rounded-full"
                      :class="avancements[i]!.etat === 'vu' ? 'bg-succes' : 'bg-social'"
                      :style="{ width: `${avancements[i]!.pourcentage}%` }"
                    />
                  </span>
                </span>
                <span class="shrink-0 font-mono text-[11.5px] text-discret">{{ dureeChapitre(c) }}</span>
              </button>
            </li>
          </ul>
        </div>

        <!-- Fin de chapitre : le suivant s'enchaîne, sauf refus. -->
        <div
          v-if="resteAvantSuivant !== null && chapitreSuivant"
          class="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/75 px-6 text-center backdrop-blur-sm"
          role="status"
        >
          <p class="text-[12.5px] tracking-wide text-discret-clair uppercase">Chapitre suivant</p>
          <p class="font-title text-[22px] font-light text-white">{{ chapitreSuivant.titre }}</p>
          <p class="text-[13.5px] text-discret-clair">
            Lecture dans {{ resteAvantSuivant }} seconde{{ resteAvantSuivant > 1 ? 's' : '' }}
          </p>
          <div class="mt-1 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              class="rounded-full bg-social px-5 py-2.5 text-[13.5px] font-extrabold text-white"
              @click="allerAuChapitre(index + 1, { lire: true })"
            >
              Passer maintenant
            </button>
            <button
              type="button"
              class="rounded-full border border-white/35 px-5 py-2.5 text-[13.5px] font-bold text-white"
              @click="annulerEnchainement"
            >
              Rester sur ce chapitre
            </button>
          </div>
          <!-- Refuser trois fois de suite, c'est refuser tout court : le choix
               se retient d'une session à l'autre. -->
          <button
            type="button"
            class="text-[12.5px] text-discret-clair underline underline-offset-2 hover:text-white"
            @click="reglerEnchainement(false)"
          >
            Ne plus enchaîner automatiquement
          </button>
        </div>

        <!-- Fin de module : le dernier chapitre ne laissait qu'une image
             arrêtée, alors que c'est ici qu'on propose la suite. -->
        <div
          v-if="moduleTermine && source"
          class="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/80 px-6 text-center backdrop-blur-sm"
          role="status"
        >
          <Icon name="ph:seal-check-fill" class="size-9 text-succes" />
          <p class="text-[12.5px] tracking-wide text-discret-clair uppercase">Module terminé</p>
          <p class="font-title text-[22px] font-light text-white">{{ moduleCourant.titre }}</p>
          <p class="max-w-md text-[13.5px] text-discret-clair">
            Le temps visionné est enregistré. L’attestation se débloque quand tous les chapitres
            sont vus.
          </p>
          <div class="mt-1 flex flex-wrap items-center justify-center gap-3">
            <NuxtLink
              :to="`/mon-espace/module/${moduleCourant.slug}`"
              class="rounded-full bg-social px-5 py-2.5 text-[13.5px] font-extrabold text-white"
            >
              Revenir au module
            </NuxtLink>
            <button
              type="button"
              class="rounded-full border border-white/35 px-5 py-2.5 text-[13.5px] font-bold text-white"
              @click="allerAuChapitre(0, { lire: true })"
            >
              Revoir depuis le début
            </button>
          </div>
        </div>

        <!-- Lecture refusée par le navigateur : la vidéo est là, c'est le geste
             qui manque. Sans ce bouton, l'apprenant restait devant une image
             figée après un enchaînement. -->
        <button
          v-if="lecteur.lectureRefusee.value && source && !moduleTermine"
          type="button"
          class="absolute inset-0 z-40 grid place-items-center bg-black/45"
          aria-label="Lancer la lecture"
          @click="lecteur.lancerLecture()"
        >
          <span class="grid size-16 place-items-center rounded-full bg-white/90 text-[26px] text-encre">
            <Icon name="ph:play-fill" class="size-7" />
          </span>
        </button>

        <EspaceControlesVideo
          v-if="controlesCustom && source"
          v-model:vitesse="lecteur.vitesse.value"
          v-model:volume="lecteur.volume.value"
          v-model:muet="lecteur.muet.value"
          :position="lecteur.positionSecondes.value"
          :duree="lecteur.dureeSecondes.value || (chapitre?.videoDureeSecondes ?? 0)"
          :en-lecture="lecteur.enLecture.value"
          :qualite="lecteur.qualite.value"
          :adaptative="autorisation?.format === 'hls'"
          :niveaux="lecteur.niveaux.value"
          :niveau-choisi="lecteur.niveauChoisi.value"
          @niveau="lecteur.choisirNiveau($event)"
          :vitesses="vitesses"
          :plein-ecran="lecteur.pleinEcran.value"
          @basculer="lecteur.basculerLecture()"
          @seek="lecteur.allerA($event)"
          @plein-ecran="lecteur.basculerPleinEcran(scene)"
        />
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 text-[12px] text-discret-clair lg:px-8">
        <span :title="`Vidéo réellement parcourue : ${horloge(lecteur.secondesVues.value)}`">
          Seules les minutes de vidéo réellement parcourues comptent, quelle que soit la vitesse —
          avancer dans la barre ne valide pas la progression.
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
        <button type="button" class="text-[13.5px] font-bold text-social-clair hover:text-white" @click="allerAuChapitre(index + 1, { lire: true })">
          {{ chapitreSuivant.libelle }} →
        </button>
      </p>
    </div>
  </div>
</template>
