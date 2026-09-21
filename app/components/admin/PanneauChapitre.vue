<script setup lang="ts">
interface ChapitreDetail {
  id: string
  libelle: string
  titre: string
  dureeMinutes: number | null
  nbLignesScript: number
  videoCle: string | null
  videoId: string | null
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
  modifier: [champs: { libelle?: string; titre?: string; dureeMinutes?: number }]
  reglages: [champs: { filigraneActif?: boolean; telechargementBloque?: boolean }]
  rafraichir: []
  /** La médiathèque s'ouvre au niveau de la page : la zone de dépôt l'ouvre
   *  aussi, et deux fenêtres pour un même choix se contrediraient. */
  mediatheque: []
}>()

const titre = ref(props.chapitre.titre)
watch(() => props.chapitre.titre, (v) => (titre.value = v))

// Le libellé (« Chapitre 3 ») et la durée annoncée se posaient à la création
// et ne se reprenaient plus : seul le titre était modifiable ici.
const libelle = ref(props.chapitre.libelle)
watch(() => props.chapitre.libelle, (v) => (libelle.value = v))

const duree = ref<number | null>(props.chapitre.dureeMinutes)
watch(() => props.chapitre.dureeMinutes, (v) => (duree.value = v))

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

// Écran 09 : filets de 1,5 px et chemise 11/13, plus serrés que les champs
// de formulaire du reste du back-office.
const champ =
  'w-full rounded-[10px] border-[1.5px] border-ligne px-3.5 py-[11px] text-[13.5px] focus:border-social focus:outline-none'
const etiquette = 'mb-1.5 block text-[12.5px] font-bold'
</script>

<template>
  <aside class="h-fit rounded-[12px] border border-ligne-douce p-[18px]">
    <h3 class="font-sans text-[14px] font-bold">Chapitre {{ numero }} — détail</h3>

    <div class="mt-3.5 flex flex-col gap-3">
      <label class="block">
        <span :class="etiquette">Titre du chapitre</span>
        <input
          v-model="titre"
          :class="champ"
          @blur="titre !== chapitre.titre && emit('modifier', { titre })"
        >
      </label>

      <div class="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label class="block">
          <span :class="etiquette">Libellé</span>
          <input
            v-model="libelle"
            placeholder="Chapitre 1"
            :class="champ"
            @blur="libelle !== chapitre.libelle && emit('modifier', { libelle })"
          >
        </label>
        <label class="block">
          <span :class="etiquette">Durée annoncée (min)</span>
          <!-- Dès qu'une vidéo est là, elle fait foi : le champ montre sa durée
               et ne se saisit plus. Avant le tournage il reste une estimation,
               et c'est à ce moment-là qu'il sert. -->
          <input
            v-model.number="duree"
            type="number"
            min="1"
            :class="[champ, chapitre.videoDureeSecondes ? 'bg-fond-voile text-discret' : '']"
            :readonly="!!chapitre.videoDureeSecondes"
            :title="chapitre.videoDureeSecondes ? 'Déduite de la durée de la vidéo déposée.' : ''"
            @blur="!chapitre.videoDureeSecondes && duree !== chapitre.dureeMinutes && duree && emit('modifier', { dureeMinutes: duree })"
          >
          <span v-if="chapitre.videoDureeSecondes" class="mt-1 block text-[11.5px] text-discret">
            Déduite de la vidéo.
          </span>
        </label>
      </div>

      <div>
        <p :class="etiquette">Vidéo</p>
        <div
          v-if="chapitre.videoCle"
          class="flex items-center justify-between gap-3 rounded-[10px] border-[1.5px] border-ligne px-3.5 py-[11px] text-[13px]"
        >
          <span class="min-w-0 truncate">
            {{ chapitre.videoNomFichier ?? chapitre.videoCle }}
            <span v-if="chapitre.videoDureeSecondes" class="text-discret">
              · {{ Math.round(chapitre.videoDureeSecondes / 60) }} min
            </span>
          </span>
          <span v-if="chapitre.videoFormat === 'hls'" class="shrink-0 text-[12px] text-discret">
            flux transcodé
          </span>
          <button v-else class="shrink-0 text-[12px] font-bold text-erreur" @click="retirerVideo">
            Retirer
          </button>
        </div>
        <p v-else class="text-[13px] text-discret">Aucune vidéo déposée.</p>

        <!-- Le fonds déjà en ligne avant le glisser-déposer : redéposer un
             fichier qui existe le paie deux fois, en temps de montée comme en
             stockage. -->
        <button
          class="mt-2 text-[12px] font-bold text-social underline"
          @click="emit('mediatheque')"
        >
          Choisir une vidéo déjà déposée…
        </button>
        <p v-if="chapitre.videoFormat === 'hls'" class="mt-1.5 text-[11.5px] text-discret">
          Flux transcodé à la main : il se retire en ligne de commande, pas ici.
        </p>
        <!-- Remplacer, c'est redéposer : le dépôt qui suit écrase la vidéo en
             place, et l'ancienne n'est effacée qu'une fois la nouvelle écrite. -->
        <p v-else-if="chapitre.videoCle" class="mt-1.5 text-[11.5px] text-discret">
          Pour la remplacer, choisissez-en une autre ci-dessus ou déposez un nouveau fichier&nbsp;:
          l’ancienne retourne à la médiathèque, elle n’est pas effacée.
        </p>
      </div>

      <div>
        <p :class="etiquette">Script synchronisé (SRT / VTT)</p>
        <div class="flex items-center justify-between gap-3 rounded-[10px] border-[1.5px] border-ligne px-3.5 py-[11px] text-[13px]">
          <span class="min-w-0 truncate" :class="chapitre.nbLignesScript ? '' : 'text-discret'">
            <template v-if="chapitre.nbLignesScript">
              {{ chapitre.scriptNomFichier ?? 'transcription' }} ✓
              <span class="text-discret">· {{ chapitre.nbLignesScript }} passages</span>
            </template>
            <template v-else>Aucune transcription importée.</template>
          </span>
          <label class="shrink-0 cursor-pointer text-[12px] font-bold text-social">
            {{ chapitre.nbLignesScript ? 'Remplacer' : 'Importer' }}
            <input
              type="file"
              accept=".srt,.vtt"
              class="sr-only"
              :disabled="importEnCours"
              @change="importerScript(($event.target as HTMLInputElement).files?.[0])"
            >
          </label>
        </div>
        <p v-if="messageScript" class="mt-1.5 text-[11.5px] text-succes">{{ messageScript }}</p>
        <p v-if="erreurScript" class="mt-1.5 text-[11.5px] text-erreur">{{ erreurScript }}</p>

        <AdminMarcheASuivre sujet="script" />
      </div>

      <!-- Ces deux réglages sont au module, pas au chapitre. La maquette les
           montre ici ; on le dit plutôt que de laisser croire le contraire. -->
      <label class="flex items-center gap-2.5 text-[12.5px] font-semibold text-texte">
        <input
          type="checkbox"
          class="size-4 accent-social"
          :checked="filigraneActif"
          @change="emit('reglages', { filigraneActif: ($event.target as HTMLInputElement).checked })"
        >
        Watermark nominatif dynamique activé
      </label>
      <label class="flex items-center gap-2.5 text-[12.5px] font-semibold text-texte">
        <input
          type="checkbox"
          class="size-4 accent-social"
          :checked="telechargementBloque"
          @change="emit('reglages', { telechargementBloque: ($event.target as HTMLInputElement).checked })"
        >
        Téléchargement bloqué (streaming seul)
      </label>
      <p class="text-[11.5px] text-discret">
        Les deux s’appliquent à tout le module. Le blocage masque le bouton de téléchargement ; il
        n’empêche ni un enregistrement d’écran, ni la récupération de l’URL signée pendant ses
        quatre heures de validité. C’est le filigrane qui rend une rediffusion attribuable.
      </p>
    </div>

  </aside>
</template>
