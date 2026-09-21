<script setup lang="ts">
/**
 * Le fonds vidéo déposé, à parcourir.
 *
 * Deux usages pour un seul composant : la page de gestion, et la fenêtre qui
 * s'ouvre depuis un chapitre pour y choisir une vidéo. Seul `choisissable`
 * distingue les deux — en dehors du bouton « Choisir », tout est identique, et
 * dédoubler le composant aurait dédoublé les corrections.
 *
 * L'aperçu compte plus qu'il n'y paraît : deux fichiers nommés « intro-v2.mp4 »
 * et « intro-v3.mp4 » ne se départagent pas sur leur nom. La vignette ne se
 * charge qu'au clic — vingt vidéos préchargées, ce sont vingt requêtes et
 * autant de mégaoctets sur un lien qui n'en a pas de trop.
 */
const props = defineProps<{
  /** Montre le bouton de sélection : la fenêtre ouverte depuis un chapitre. */
  choisissable?: boolean
  /** Vidéo déjà servie par le chapitre appelant, signalée comme telle. */
  videoIdCourante?: string | null
}>()

const emit = defineEmits<{ choisir: [video: VideoMediatheque] }>()

const recherche = ref('')
const apercu = ref<string | null>(null)
const renomme = ref<string | null>(null)
const titre = ref('')
const erreur = ref('')
const occupe = ref(false)

interface VideoMediatheque {
  id: string
  cle: string
  nom: string
  nomFichier: string
  tailleOctets: number | null
  dureeSecondes: number | null
  format: 'hls' | 'fichier'
  deposeLe: string
  url: string
  usages: { chapitreId: string; libelle: string; moduleId: string; moduleTitre: string }[]
}

/**
 * Chargement au montage plutôt qu'avec un `await useFetch` en tête de `setup`.
 *
 * La différence n'est pas cosmétique : un `await` au niveau racine fait de ce
 * composant un composant asynchrone, et le monter dans une fenêtre déjà
 * affichée renvoie le `Suspense` de la page à l'état « en attente ». La page se
 * fige alors, fenêtre vide, sans la moindre erreur en console.
 */
const data = ref<VideoMediatheque[]>([])
const pending = ref(true)

async function refresh() {
  pending.value = true
  try {
    data.value = await $fetch<VideoMediatheque[]>('/api/admin/mediatheque')
  } catch (e) {
    erreur.value = messageDErreur(e)
  } finally {
    pending.value = false
  }
}

onMounted(refresh)


const filtrees = computed(() => {
  const q = recherche.value.trim().toLowerCase()
  if (!q) return data.value
  return data.value.filter(
    (v) =>
      v.nom.toLowerCase().includes(q) ||
      v.nomFichier.toLowerCase().includes(q) ||
      v.usages.some((u) => `${u.moduleTitre} ${u.libelle}`.toLowerCase().includes(q)),
  )
})

const poids = (octets: number | null) =>
  octets === null ? '—' : `${(octets / 1024 / 1024).toFixed(0)} Mo`

const duree = (secondes: number | null) => {
  if (!secondes) return '—'
  const minutes = Math.floor(secondes / 60)
  return `${minutes} min ${String(Math.round(secondes % 60)).padStart(2, '0')}`
}

const leJour = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

function ouvrirRenommage(video: VideoMediatheque) {
  renomme.value = video.id
  titre.value = video.nom
  erreur.value = ''
}

async function enregistrerTitre(video: VideoMediatheque) {
  const propre = titre.value.trim()
  if (!propre || propre === video.nom) {
    renomme.value = null
    return
  }
  occupe.value = true
  erreur.value = ''
  try {
    await $fetch('/api/admin/mediatheque/renommer', {
      method: 'POST',
      body: { id: video.id, nom: propre },
    })
    renomme.value = null
    await refresh()
  } catch (e) {
    erreur.value = messageDErreur(e)
  } finally {
    occupe.value = false
  }
}

async function supprimer(video: VideoMediatheque) {
  // Le refus du serveur nomme les chapitres concernés : le laisser remonter tel
  // quel vaut mieux que de deviner ici ce qu'il sait déjà.
  occupe.value = true
  erreur.value = ''
  try {
    await $fetch('/api/admin/mediatheque/supprimer', { method: 'POST', body: { id: video.id } })
    await refresh()
  } catch (e) {
    erreur.value = messageDErreur(e)
  } finally {
    occupe.value = false
  }
}

function messageDErreur(e: unknown): string {
  const avec = e as { statusMessage?: string; data?: { statusMessage?: string }; message?: string }
  return avec.data?.statusMessage ?? avec.statusMessage ?? avec.message ?? 'L’opération a échoué.'
}

defineExpose({ refresh })
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <label class="relative min-w-[220px] flex-1">
        <span class="sr-only">Rechercher une vidéo</span>
        <input
          v-model="recherche"
          type="search"
          placeholder="Rechercher par titre, fichier ou chapitre…"
          class="w-full rounded-full border-[1.5px] border-ligne px-4 py-2.5 text-[13px] focus:border-social focus:outline-none"
        >
      </label>
      <p class="text-[12.5px] text-discret">
        {{ filtrees.length }} vidéo{{ filtrees.length > 1 ? 's' : '' }}
        <template v-if="recherche"> sur {{ data.length }}</template>
      </p>
    </div>

    <p v-if="erreur" class="mt-3 rounded-[10px] border border-erreur-bordure bg-erreur-voile px-3.5 py-[11px] text-[12px] text-erreur-fonce">
      {{ erreur }}
    </p>

    <p v-if="pending && !data.length" class="mt-6 text-[13px] text-discret">Chargement…</p>

    <p v-else-if="!data.length" class="mt-6 rounded-[12px] border-[1.5px] border-dashed border-ligne-pointillee p-6 text-center text-[13px] text-discret">
      Aucune vidéo déposée pour l’instant. Les fichiers téléversés depuis un chapitre viendront
      s’ajouter ici, et pourront ensuite servir plusieurs chapitres.
    </p>

    <p v-else-if="!filtrees.length" class="mt-6 text-[13px] text-discret">
      Aucune vidéo ne correspond à « {{ recherche }} ».
    </p>

    <ul v-else class="mt-4 grid gap-3">
      <li
        v-for="video in filtrees"
        :key="video.id"
        class="rounded-[12px] border-[1.5px] p-4"
        :class="video.id === videoIdCourante ? 'border-social bg-social-voile' : 'border-ligne'"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div v-if="renomme === video.id" class="flex flex-wrap items-center gap-2">
              <input
                v-model="titre"
                class="min-w-[200px] flex-1 rounded-[8px] border-[1.5px] border-social px-3 py-1.5 text-[13.5px] focus:outline-none"
                :disabled="occupe"
                @keyup.enter="enregistrerTitre(video)"
                @keyup.escape="renomme = null"
              >
              <button class="text-[12px] font-bold text-social" :disabled="occupe" @click="enregistrerTitre(video)">
                Enregistrer
              </button>
              <button class="text-[12px] text-discret" :disabled="occupe" @click="renomme = null">
                Annuler
              </button>
            </div>
            <p v-else class="truncate text-[13.5px] font-bold text-encre">
              {{ video.nom }}
              <span v-if="video.id === videoIdCourante" class="ml-1 text-[11.5px] font-normal text-social">
                · vidéo de ce chapitre
              </span>
            </p>

            <p class="mt-1 text-[11.5px] text-discret">
              {{ duree(video.dureeSecondes) }} · {{ poids(video.tailleOctets) }} ·
              déposée le {{ leJour(video.deposeLe) }}
              <template v-if="video.nomFichier !== video.nom"> · {{ video.nomFichier }}</template>
              <template v-if="video.format === 'hls'"> · flux transcodé</template>
            </p>

            <p v-if="video.usages.length" class="mt-1 text-[11.5px] text-discret">
              Utilisée par
              <span v-for="(usage, i) in video.usages" :key="usage.chapitreId">
                <template v-if="i">, </template>
                <NuxtLink :to="`/admin/module/${usage.moduleId}`" class="underline">
                  {{ usage.moduleTitre }} — {{ usage.libelle }}
                </NuxtLink>
              </span>
            </p>
            <p v-else class="mt-1 text-[11.5px] text-discret">Utilisée par aucun chapitre.</p>
          </div>

          <div class="flex shrink-0 flex-wrap items-center gap-3 text-[12px]">
            <button class="text-discret underline" @click="apercu = apercu === video.id ? null : video.id">
              {{ apercu === video.id ? 'Masquer' : 'Aperçu' }}
            </button>
            <button v-if="renomme !== video.id" class="text-discret underline" @click="ouvrirRenommage(video)">
              Renommer
            </button>
            <button
              v-if="!video.usages.length && video.format !== 'hls'"
              class="font-bold text-erreur"
              :disabled="occupe"
              @click="supprimer(video)"
            >
              Supprimer
            </button>
            <button
              v-if="choisissable && video.id !== videoIdCourante"
              class="rounded-full bg-social px-4 py-1.5 font-extrabold text-white"
              @click="emit('choisir', video)"
            >
              Choisir
            </button>
          </div>
        </div>

        <!-- `preload="none"` : la vidéo ne part que sur un geste, et l'aperçu
             d'un fonds de vingt fichiers ne coûte rien tant qu'on n'en ouvre
             aucun. -->
        <video
          v-if="apercu === video.id"
          :src="video.url"
          controls
          preload="none"
          controlslist="nodownload"
          class="mt-3 w-full max-w-[480px] rounded-[10px] bg-black"
        />
      </li>
    </ul>
  </div>
</template>
