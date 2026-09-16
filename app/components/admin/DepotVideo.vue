<script setup lang="ts">
/**
 * Zone de dépôt d'une vidéo de chapitre.
 *
 * La progression vient du composable, qui pousse les parts directement vers le
 * diffuseur. Ce composant ne fait que montrer où l'on en est — et surtout
 * proposer la reprise, que la maquette exige et qu'un dépôt de sept cents
 * mégaoctets rend indispensable.
 */
const props = defineProps<{
  chapitreId: string
  moduleId: string
  /** Un dépôt lancé ailleurs, relevé côté serveur. */
  depotEnCours: { nomFichier: string; nbParts: number; parts: unknown[] } | null
}>()

const emit = defineEmits<{ termine: []; annule: [] }>()

const depot = useTeleversementVideo()
const champ = ref<HTMLInputElement | null>(null)
const survol = ref(false)

onMounted(() => depot.chercherReprise(props.chapitreId))

async function choisir(fichier: File | null | undefined) {
  if (!fichier) return
  if (depot.repriseDisponible.value) {
    await depot.reprendre(props.chapitreId, fichier)
  } else {
    await depot.deposer(props.chapitreId, props.moduleId, fichier)
  }
  if (depot.etat.value === 'termine') emit('termine')
}

function surDepotFichier(evenement: DragEvent) {
  survol.value = false
  void choisir(evenement.dataTransfer?.files?.[0])
}

async function annuler() {
  await depot.annuler(props.chapitreId, undefined)
  emit('annule')
}

/** Tant qu'un dépôt tourne, fermer l'onglet le perd : le navigateur prévient. */
function avertirAvantFermeture(evenement: BeforeUnloadEvent) {
  if (depot.etat.value === 'envoi') evenement.preventDefault()
}
onMounted(() => window.addEventListener('beforeunload', avertirAvantFermeture))
onBeforeUnmount(() => window.removeEventListener('beforeunload', avertirAvantFermeture))

const enCours = computed(() => ['controle', 'envoi', 'finalisation'].includes(depot.etat.value))

const dureeRestante = computed(() => {
  const s = depot.resteSecondes.value
  if (s === null) return ''
  if (s < 60) return `${s} s restantes`
  return `${Math.round(s / 60)} min restantes`
})

const LIBELLE_ETAT: Record<string, string> = {
  controle: 'Contrôle du fichier…',
  envoi: 'Téléversement',
  finalisation: 'Finalisation…',
}
</script>

<template>
  <div>
    <!-- Dépôt lancé ailleurs : le signaler vaut mieux que de proposer d'en
         ouvrir un second, que la base refuserait. -->
    <p
      v-if="depotEnCours && !enCours"
      class="mb-3 rounded-[10px] border border-alerte-bordure bg-alerte-pale px-3.5 py-[11px] text-[12px] text-alerte-fonce"
    >
      Un téléversement de <b>{{ depotEnCours.nomFichier }}</b> est déjà en cours sur ce chapitre
      ({{ depotEnCours.parts.length }} / {{ depotEnCours.nbParts }} parts).
      <button class="underline" @click="annuler">L’abandonner</button>
      pour en lancer un autre.
    </p>

    <p
      v-else-if="depot.repriseDisponible.value && !enCours"
      class="mb-3 rounded-[10px] border border-alerte-bordure bg-alerte-pale px-3.5 py-[11px] text-[12px] text-alerte-fonce"
    >
      Téléversement interrompu à
      {{ Math.round((depot.repriseDisponible.value.parts.length / depot.repriseDisponible.value.nbParts) * 100) }} % —
      resélectionnez <b>{{ depot.repriseDisponible.value.fichier.nom }}</b> pour reprendre, ou
      <button class="underline" @click="annuler">annulez</button>.
    </p>

    <div
      v-if="!enCours"
      class="rounded-[12px] border-[1.5px] border-dashed p-5 text-center text-[13px] text-discret"
      :class="survol ? 'border-social bg-social-voile' : 'border-ligne-pointillee'"
      @dragover.prevent="survol = true"
      @dragleave="survol = false"
      @drop.prevent="surDepotFichier"
    >
      <p>
        ⬆ Glissez une vidéo (MP4, 1080p max) ou
        <label class="cursor-pointer font-bold text-social">
          parcourir
          <input
            ref="champ"
            type="file"
            accept="video/mp4,.mp4"
            class="sr-only"
            @change="choisir(($event.target as HTMLInputElement).files?.[0])"
          >
        </label>
        — upload repris automatiquement en cas de coupure
      </p>
      <p class="mt-1.5 text-[11.5px]">
        Aucun transcodage n’est fait par la plateforme : le fichier est servi tel quel.
      </p>
    </div>

    <div v-else class="rounded-[12px] border border-ligne-douce bg-white px-[18px] py-4">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <p class="text-[13.5px] font-bold text-encre">
          {{ LIBELLE_ETAT[depot.etat.value] }} — {{ depot.nomFichier.value }}
        </p>
        <p class="text-[12.5px] text-discret">
          <template v-if="depot.etat.value === 'envoi'">
            {{ depot.progression.value }} %
            <template v-if="depot.debitKoS.value"> · {{ Math.round(depot.debitKoS.value / 1024 * 10) / 10 }} Mo/s</template>
            <template v-if="dureeRestante"> · {{ dureeRestante }}</template>
          </template>
        </p>
      </div>
      <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-fond-voile">
        <div
          class="h-full rounded-full bg-social transition-[width] duration-300"
          :style="{ width: `${depot.progression.value}%` }"
        />
      </div>
      <button class="mt-3 text-[12.5px] text-erreur underline" @click="annuler">
        Annuler le téléversement
      </button>
    </div>

    <p v-if="depot.erreur.value" class="mt-3 rounded-[10px] border border-erreur-bordure bg-erreur-voile px-3.5 py-[11px] text-[12px] text-erreur-fonce">
      {{ depot.erreur.value }}
    </p>

    <AdminMarcheASuivre sujet="video" />
  </div>
</template>
