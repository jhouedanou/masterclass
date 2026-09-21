<script setup lang="ts">
/**
 * Barre de contrôles du lecteur (planche B, écran 03) : rail de déplacement,
 * lecture/pause, temps, pilule de vitesse, qualité servie, plein écran.
 *
 * Composant sans mémoire du lecteur : il reçoit des valeurs et émet des
 * intentions. Le seul état qu'il tient est celui du glissement, qui n'existe
 * que pendant le geste — pendant qu'on tire la poignée, l'affichage suit le
 * doigt et non `timeupdate`, sinon la poignée reviendrait en arrière à chaque
 * relevé.
 */
const props = defineProps<{
  position: number
  duree: number
  enLecture: boolean
  qualite: string | null
  /** Vrai quand la qualité s'adapte au débit — c'est-à-dire en HLS seulement.
   *  Un fichier unique n'offre rien à choisir, et le dire évite de chercher un
   *  réglage qui n'existe pas. */
  adaptative?: boolean
  /** Définitions que le flux propose vraiment. Vide sur un fichier unique et
   *  sur la lecture native de Safari : il n'y a alors rien à choisir, et la
   *  pastille cesse d'être un bouton plutôt que d'en rester un qui n'obéit
   *  pas. */
  niveaux?: { index: number; hauteur: number }[]
  /** Définition imposée par l'apprenant, `-1` quand il laisse faire. */
  niveauChoisi?: number
  vitesses: number[]
  pleinEcran: boolean
}>()

const emit = defineEmits<{
  basculer: []
  seek: [secondes: number]
  pleinEcran: []
  niveau: [index: number]
}>()

const vitesse = defineModel<number>('vitesse', { required: true })
const volume = defineModel<number>('volume', { default: 1 })
const muet = defineModel<boolean>('muet', { default: false })

/** Trois paliers d'icône : coupé, faible, fort. Une seule icône de haut-parleur
 *  ne dirait pas d'un coup d'œil si le son est éteint. */
const iconeVolume = computed(() => {
  if (muet.value || volume.value === 0) return 'ph:speaker-slash'
  return volume.value < 0.5 ? 'ph:speaker-low' : 'ph:speaker-high'
})

/** Glisser la réglette rallume le son : pousser le volume sans entendre serait
 *  incompréhensible. */
function surVolume(evenement: Event) {
  const valeur = Number((evenement.target as HTMLInputElement).value)
  volume.value = valeur
  if (valeur > 0) muet.value = false
}

/**
 * Le choix de définition suit la même langue que celui de la vitesse : une
 * pastille qui avance d'un cran à chaque clic, `Auto` compris. Un menu
 * déroulant aurait demandé une couche de plus par-dessus la vidéo, là où la
 * maquette n'en dessine aucune — et il se serait mal tenu en plein écran.
 */
const choixQualite = computed(() => [-1, ...(props.niveaux ?? []).map((n) => n.index)])

/** Un seul niveau n'est pas un choix : `Auto` et lui diraient la même chose. */
const qualiteChoisissable = computed(() => (props.niveaux?.length ?? 0) > 1)

const libelleQualite = computed(() => {
  const impose = props.niveaux?.find((n) => n.index === props.niveauChoisi)
  if (impose) return `${impose.hauteur}p`
  return props.adaptative ? `Auto ${props.qualite}` : props.qualite
})

function qualiteSuivante() {
  const i = choixQualite.value.indexOf(props.niveauChoisi ?? -1)
  emit('niveau', choixQualite.value[(i + 1) % choixQualite.value.length] ?? -1)
}

const rail = ref<HTMLElement | null>(null)
const enGlissement = ref(false)
const apercu = ref(0)

const affichee = computed(() => (enGlissement.value ? apercu.value : props.position))
const pct = computed(() => (props.duree ? `${Math.min(100, (affichee.value / props.duree) * 100)}%` : '0%'))

function horloge(secondes: number): string {
  const s = Math.max(0, Math.floor(secondes))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
const temps = computed(() => `${horloge(affichee.value)} / ${horloge(props.duree)}`)

function secondesSousPointeur(evenement: PointerEvent): number {
  const cadre = rail.value?.getBoundingClientRect()
  if (!cadre?.width) return 0
  const ratio = Math.min(1, Math.max(0, (evenement.clientX - cadre.left) / cadre.width))
  return ratio * props.duree
}

function surPointerdown(evenement: PointerEvent) {
  if (!props.duree) return
  enGlissement.value = true
  apercu.value = secondesSousPointeur(evenement)
  // Sans capture, le glissement meurt dès que le pointeur quitte le rail — un
  // rail de 5 px de haut, c'est-à-dire presque tout de suite.
  ;(evenement.currentTarget as HTMLElement).setPointerCapture(evenement.pointerId)
}

function surPointermove(evenement: PointerEvent) {
  if (!enGlissement.value) return
  apercu.value = secondesSousPointeur(evenement)
}

function surPointerup() {
  if (!enGlissement.value) return
  enGlissement.value = false
  // Un seul déplacement, au relâchement : en émettre un par mouvement noierait
  // un flux HLS sous les rechargements de segment.
  emit('seek', apercu.value)
}

function surClavier(evenement: KeyboardEvent) {
  const pas: Record<string, number> = {
    ArrowLeft: -5,
    ArrowRight: 5,
    ArrowDown: -10,
    ArrowUp: 10,
    PageDown: -60,
    PageUp: 60,
  }
  if (evenement.key in pas) {
    evenement.preventDefault()
    emit('seek', props.position + pas[evenement.key]!)
    return
  }
  if (evenement.key === 'Home') {
    evenement.preventDefault()
    emit('seek', 0)
  } else if (evenement.key === 'End') {
    evenement.preventDefault()
    emit('seek', props.duree)
  }
}

function vitesseSuivante() {
  const i = props.vitesses.indexOf(vitesse.value)
  vitesse.value = props.vitesses[(i + 1) % props.vitesses.length] ?? 1
}
</script>

<template>
  <div class="absolute inset-x-0 bottom-0 z-20 bg-linear-to-b from-transparent to-black/75 px-6 pt-5 pb-4">
    <!-- Le rail ne mesure que 5 px : la zone de pointage est élargie autour. -->
    <div class="-mt-2 mb-1 cursor-pointer py-2">
      <div
        ref="rail"
        role="slider"
        :tabindex="duree ? 0 : -1"
        :aria-disabled="duree ? undefined : true"
        aria-label="Position dans la vidéo"
        aria-orientation="horizontal"
        :aria-valuemin="0"
        :aria-valuemax="Math.floor(duree)"
        :aria-valuenow="Math.floor(affichee)"
        :aria-valuetext="`${horloge(affichee)} sur ${horloge(duree)}`"
        class="relative h-[5px] touch-none rounded-full bg-white/22 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        :class="duree ? '' : 'pointer-events-none'"
        @pointerdown="surPointerdown"
        @pointermove="surPointermove"
        @pointerup="surPointerup"
        @pointercancel="surPointerup"
        @keydown="surClavier"
      >
        <div
          class="h-full rounded-full bg-social transition-[width] duration-150 motion-reduce:transition-none"
          :style="{ width: pct }"
        />
        <div class="absolute top-[-4px] size-[13px] -translate-x-1/2 rounded-full bg-white" :style="{ left: pct }" />
      </div>
    </div>

    <div class="flex items-center gap-[18px] text-[13px] text-white">
      <button
        type="button"
        class="text-[17px] leading-none"
        :aria-label="enLecture ? 'Pause' : 'Lecture'"
        @click="emit('basculer')"
      >
        <span aria-hidden="true">{{ enLecture ? '⏸' : '▶' }}</span>
      </button>
      <span class="tabular-nums">{{ temps }}</span>

      <!-- Le son. La barre remplace les contrôles natifs sur écran large : sans
           ces deux commandes, il ne restait plus aucun moyen de baisser le
           volume sans passer par le système. La réglette n'apparaît qu'au
           survol ou au focus, pour ne pas encombrer une barre que la maquette
           veut sobre. -->
      <div class="group/son flex items-center gap-2">
        <button
          type="button"
          class="leading-none"
          :aria-label="muet || volume === 0 ? 'Rétablir le son' : 'Couper le son'"
          :aria-pressed="muet || volume === 0"
          @click="muet = !muet"
        >
          <Icon :name="iconeVolume" size="18" />
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          :value="muet ? 0 : volume"
          aria-label="Volume"
          class="h-1 w-0 cursor-pointer appearance-none rounded-full bg-white/30 opacity-0 transition-all duration-200 group-hover/son:w-20 group-hover/son:opacity-100 focus:w-20 focus:opacity-100 [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
          @input="surVolume"
        >
      </div>
      <button
        type="button"
        class="ml-auto rounded-lg border border-white/35 px-2.5 py-1 font-bold"
        :aria-label="`Vitesse de lecture : ${vitesse}×`"
        @click="vitesseSuivante"
      >
        {{ vitesse }}×
      </button>
      <!-- Le choix n'est un bouton que là où il porte : ailleurs la pastille
           reste une étiquette, et sans bordure, pour ne plus se confondre avec
           la pilule de vitesse qui la jouxte — c'est cette ressemblance qui
           faisait cliquer dessus en vain. -->
      <button
        v-if="qualite && qualiteChoisissable"
        type="button"
        class="rounded-lg border border-white/35 px-2.5 py-1"
        :aria-label="`Définition : ${libelleQualite}. Changer.`"
        title="Définition de l’image — « Auto » suit le débit disponible"
        @click="qualiteSuivante"
      >
        {{ libelleQualite }}
      </button>
      <span
        v-else-if="qualite"
        class="px-1 text-white/60"
        :title="adaptative
          ? 'Qualité adaptée automatiquement au débit'
          : 'Cette vidéo est servie en une seule définition : il n’y a pas de qualité à choisir.'"
      >
        {{ libelleQualite }}
      </span>
      <button
        type="button"
        class="leading-none"
        :aria-label="pleinEcran ? 'Quitter le plein écran' : 'Plein écran'"
        :aria-pressed="pleinEcran"
        @click="emit('pleinEcran')"
      >
        <!-- Le glyphe ⛶ de la maquette manque à trop de systèmes pour être sûr. -->
        <Icon :name="pleinEcran ? 'ph:corners-in' : 'ph:corners-out'" size="18" />
      </button>
    </div>
  </div>
</template>
