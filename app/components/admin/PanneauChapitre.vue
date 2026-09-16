<script setup lang="ts">
interface ChapitreDetail {
  id: string
  libelle: string
  titre: string
  dureeMinutes: number | null
  nbLignesScript: number
  videoCle: string | null
  videoFormat: 'hls' | 'fichier' | null
  videoNomFichier: string | null
  videoDureeSecondes: number | null
  scriptNomFichier: string | null
}

const props = defineProps<{
  chapitre: ChapitreDetail
  numero: number
  filigraneActif: boolean
  telechargementBloque: boolean
}>()

const emit = defineEmits<{
  modifier: [champs: { titre?: string; dureeMinutes?: number }]
  reglages: [champs: { filigraneActif?: boolean; telechargementBloque?: boolean }]
  rafraichir: []
}>()

const titre = ref(props.chapitre.titre)
watch(() => props.chapitre.titre, (v) => (titre.value = v))

const importEnCours = ref(false)
const messageScript = ref('')
const erreurScript = ref('')

async function importerScript(fichier: File | null | undefined) {
  if (!fichier) return
  erreurScript.value = ''
  messageScript.value = ''
  importEnCours.value = true
  try {
    const corps = new FormData()
    corps.append('chapitreId', props.chapitre.id)
    corps.append('fichier', fichier)
    const r = await $fetch<{ lignes: number }>('/api/admin/video/script', {
      method: 'POST',
      body: corps,
    })
    // Le nombre de passages est la seule preuve immédiate que le fichier était
    // le bon : un import silencieux ne dirait rien d'un décalage de piste.
    messageScript.value = `Script importé — ${r.lignes} passages.`
    emit('rafraichir')
  } catch (e) {
    erreurScript.value = (e as { statusMessage?: string }).statusMessage ?? 'L’import a échoué.'
  } finally {
    importEnCours.value = false
  }
}

async function retirerVideo() {
  erreurScript.value = ''
  try {
    await $fetch('/api/admin/video/supprimer', {
      method: 'POST',
      body: { chapitreId: props.chapitre.id },
    })
    emit('rafraichir')
  } catch (e) {
    erreurScript.value = (e as { statusMessage?: string }).statusMessage ?? 'Le retrait a échoué.'
  }
}

const champ =
  'w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] focus:border-social focus:outline-none'
</script>

<template>
  <aside class="h-fit rounded-[14px] border border-ligne-douce bg-white p-5">
    <h3 class="font-title text-[17px] font-light">Chapitre {{ numero }} — détail</h3>

    <label class="mt-4 block">
      <span class="mb-1.5 block text-[13px] font-bold">Titre du chapitre</span>
      <input
        v-model="titre"
        :class="champ"
        @blur="titre !== chapitre.titre && emit('modifier', { titre })"
      >
    </label>

    <div class="mt-4 border-t border-ligne-claire pt-4">
      <p class="text-[13px] font-bold">Vidéo</p>
      <p v-if="chapitre.videoCle" class="mt-1.5 text-[13px] text-texte">
        {{ chapitre.videoNomFichier ?? chapitre.videoCle }}
        <span v-if="chapitre.videoDureeSecondes" class="text-discret">
          · {{ Math.round(chapitre.videoDureeSecondes / 60) }} min
        </span>
        <span v-if="chapitre.videoFormat === 'hls'" class="mt-0.5 block text-[12px] text-discret">
          Flux transcodé à la main : il se retire en ligne de commande, pas ici.
        </span>
        <button
          v-else
          class="mt-1 block text-[12.5px] text-erreur underline"
          @click="retirerVideo"
        >
          Retirer la vidéo
        </button>
      </p>
      <p v-else class="mt-1.5 text-[13px] text-discret">Aucune vidéo déposée.</p>
    </div>

    <div class="mt-4 border-t border-ligne-claire pt-4">
      <p class="text-[13px] font-bold">Script synchronisé (SRT / VTT)</p>
      <p class="mt-1.5 text-[13px]" :class="chapitre.nbLignesScript ? 'text-succes' : 'text-discret'">
        <template v-if="chapitre.nbLignesScript">
          {{ chapitre.scriptNomFichier ?? 'transcription' }} ✓
          <span class="text-discret">· {{ chapitre.nbLignesScript }} passages</span>
        </template>
        <template v-else>Aucune transcription importée.</template>
      </p>
      <label class="mt-2 inline-block cursor-pointer text-[12.5px] text-social underline">
        {{ chapitre.nbLignesScript ? 'Remplacer' : 'Importer un fichier' }}
        <input
          type="file"
          accept=".srt,.vtt"
          class="sr-only"
          :disabled="importEnCours"
          @change="importerScript(($event.target as HTMLInputElement).files?.[0])"
        >
      </label>
      <p v-if="messageScript" class="mt-2 text-[12.5px] text-succes">{{ messageScript }}</p>
      <p v-if="erreurScript" class="mt-2 text-[12.5px] text-erreur">{{ erreurScript }}</p>

      <AdminMarcheASuivre sujet="script" />
    </div>

    <!-- Ces deux réglages sont au module, pas au chapitre. La maquette les
         montre ici ; on le dit plutôt que de laisser croire le contraire. -->
    <div class="mt-4 border-t border-ligne-claire pt-4">
      <label class="flex items-start gap-2.5 text-[13.5px]">
        <input
          type="checkbox"
          class="mt-0.5"
          :checked="filigraneActif"
          @change="emit('reglages', { filigraneActif: ($event.target as HTMLInputElement).checked })"
        >
        Watermark nominatif dynamique activé
      </label>
      <label class="mt-2.5 flex items-start gap-2.5 text-[13.5px]">
        <input
          type="checkbox"
          class="mt-0.5"
          :checked="telechargementBloque"
          @change="emit('reglages', { telechargementBloque: ($event.target as HTMLInputElement).checked })"
        >
        Téléchargement bloqué (streaming seul)
      </label>
      <p class="mt-2 text-[12px] text-discret">
        S’appliquent à tout le module. Le blocage masque le bouton de
        téléchargement ; il n’empêche ni un enregistrement d’écran, ni la récupération de l’URL
        signée pendant ses quatre heures de validité. C’est le filigrane qui rend une rediffusion
        attribuable.
      </p>
    </div>
  </aside>
</template>
