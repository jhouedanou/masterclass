<script setup lang="ts">
import type { Formateur, Module, Thematique } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

interface Chapitre {
  id: string
  position: number
  libelle: string
  titre: string
  dureeMinutes: number | null
  nbLignesScript: number
  videoCle: string | null
  videoFormat: 'hls' | 'fichier' | null
  videoNomFichier: string | null
  videoDureeSecondes: number | null
  videoTailleOctets: number | null
  scriptNomFichier: string | null
  depotEnCours: { nomFichier: string; nbParts: number; parts: unknown[] } | null
}

interface Checklist {
  pret: boolean
  manques: string[]
  details: {
    chapitres: number
    avecVideo: number
    avecScript: number
    dureeMinutes: number
    dureeCibleMinutes: number
  }
}
interface Ressource {
  id: string
  titre: string
  url: string
  format: string
}
interface Version {
  id: string
  libelle: string
  auteur: string
  creeLe: string
}

const route = useRoute()
const { data, refresh } = await useFetch<{
  module: Module
  chapitres: Chapitre[]
  ressources: Ressource[]
  thematiques: Thematique[]
  formateurs: Formateur[]
  versions: Version[]
  peutOuvrirOffre: boolean
  checklist: Checklist
}>(() => `/api/admin/module/${route.params.id}`)

if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Module introuvable', fatal: true })
}

usePagePrivee(`${data.value.module.titre} — édition`)

type Onglet = 'informations' | 'chapitres' | 'ressources' | 'fiche' | 'offre' | 'referencement' | 'historique'
const ONGLETS_VALIDES: Onglet[] = [
  'informations',
  'chapitres',
  'ressources',
  'fiche',
  'offre',
  'referencement',
  'historique',
]
// L'arbre des contenus et la fiche commerciale pointent directement sur un
// onglet : sans cette lecture, leurs liens retombaient tous sur « Informations ».
const ongletDemande = route.query.onglet as Onglet | undefined
const onglet = ref<Onglet>(
  ongletDemande && ONGLETS_VALIDES.includes(ongletDemande) ? ongletDemande : 'informations',
)
const erreur = ref('')
const succes = ref('')
const enCours = ref(false)

// --- Informations -----------------------------------------------------------

const fiche = reactive({
  titre: '',
  promesse: '',
  pourquoi: '',
  prerequis: '',
  livrable: '',
  pourQui: '',
  acquis: '',
})

watchEffect(() => {
  const m = data.value?.module
  if (!m) return
  Object.assign(fiche, {
    titre: m.titre,
    promesse: m.promesse,
    pourquoi: m.pourquoi,
    prerequis: m.prerequis,
    livrable: m.livrable,
    // Une ligne = une puce sur la fiche publique.
    pourQui: m.pourQui.join('\n'),
    acquis: m.acquis.join('\n'),
  })
})

const lignes = (v: string) => v.split('\n').map((l) => l.trim()).filter(Boolean)

async function enregistrerFiche() {
  await appliquer({
    titre: fiche.titre,
    promesse: fiche.promesse,
    pourquoi: fiche.pourquoi,
    prerequis: fiche.prerequis,
    livrable: fiche.livrable,
    pourQui: lignes(fiche.pourQui),
    acquis: lignes(fiche.acquis),
  })
}

/** `silencieux` : l'enregistrement automatique n'affiche ni bandeau de succès
 *  ni voyant d'attente — il ne doit pas se faire remarquer. */
async function appliquer(champs: Record<string, unknown>, options: { silencieux?: boolean } = {}) {
  erreur.value = ''
  if (!options.silencieux) {
    succes.value = ''
    enCours.value = true
  }
  try {
    await $fetch('/api/admin/modules', {
      method: 'PUT',
      body: { id: data.value!.module.id, ...champs },
    })
    if (!options.silencieux) succes.value = 'Enregistré. La version précédente reste restaurable.'
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'L’enregistrement a échoué.'
  } finally {
    if (!options.silencieux) enCours.value = false
  }
}

// --- Chapitres --------------------------------------------------------------

const nouveauChapitre = reactive({ libelle: '', titre: '', dureeMinutes: 18 })

async function chapitre(body: Record<string, unknown>) {
  erreur.value = ''
  try {
    await $fetch('/api/admin/chapitres', {
      method: 'POST',
      body: { moduleId: data.value!.module.id, ...body },
    })
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Action impossible.'
  }
}

async function ajouterChapitre() {
  if (!nouveauChapitre.titre.trim()) return
  await chapitre({ action: 'creer', ...nouveauChapitre })
  Object.assign(nouveauChapitre, { libelle: '', titre: '', dureeMinutes: 18 })
}

/** Déplacement d'un cran : suffisant au clavier comme à la souris, et sans
 *  dépendance de glisser-déposer. */
async function deplacer(index: number, sens: -1 | 1) {
  const ids = data.value!.chapitres.map((c) => c.id)
  const cible = index + sens
  if (cible < 0 || cible >= ids.length) return
  ;[ids[index], ids[cible]] = [ids[cible]!, ids[index]!]
  await chapitre({ action: 'reordonner', ordre: ids })
}

// --- Ressources -------------------------------------------------------------

const nouvelleRessource = reactive({ titre: '', url: '', format: 'PDF' })

async function ressource(body: Record<string, unknown>) {
  await $fetch('/api/admin/ressources', {
    method: 'POST',
    body: { moduleId: data.value!.module.id, ...body },
  })
  await refresh()
}

async function ajouterRessource() {
  if (!nouvelleRessource.titre.trim() || !nouvelleRessource.url.trim()) return
  await ressource({ action: 'creer', ...nouvelleRessource })
  Object.assign(nouvelleRessource, { titre: '', url: '' })
}

// --- Offre ------------------------------------------------------------------

const prix = ref(0)
watchEffect(() => { if (data.value) prix.value = data.value.module.prixFcfa })

async function restaurer(versionId: string) {
  erreur.value = ''
  try {
    await $fetch('/api/admin/versions', { method: 'POST', body: { versionId } })
    succes.value = 'Version restaurée.'
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'La restauration a échoué.'
  }
}

// --- Chapitre sélectionné, « Prêt », autosave -------------------------------

const chapitreSelectionne = ref<string>('')
watchEffect(() => {
  const liste = data.value?.chapitres ?? []
  if (!liste.some((c) => c.id === chapitreSelectionne.value)) {
    chapitreSelectionne.value = liste[0]?.id ?? ''
  }
})
const chapitreCourant = computed(
  () => data.value?.chapitres.find((c) => c.id === chapitreSelectionne.value) ?? null,
)

async function basculerPret() {
  erreur.value = ''
  try {
    await $fetch('/api/admin/pret', {
      method: 'POST',
      body: { id: data.value!.module.id, pret: !data.value!.module.pretLe },
    })
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Action impossible.'
  }
}

async function reglagesModule(champs: Record<string, unknown>) {
  await appliquer(champs)
}

/**
 * Enregistrement automatique.
 *
 * Le drapeau `autosave` coupe côté serveur la création d'une version et
 * l'écriture au journal : sans lui, une séance de rédaction laisserait des
 * centaines d'entrées dans l'onglet Historique, où plus personne ne
 * retrouverait la modification qui compte.
 */
// Trois secondes après la dernière frappe (planche C, écran 09).
const DELAI_AUTOSAVE = 3000
let minuteurAutosave: ReturnType<typeof setTimeout> | undefined
const enregistreLe = ref<number | null>(null)
const maintenantMs = ref(Date.now())

let premierPassage = true
watch(
  fiche,
  () => {
    // Le premier passage est le remplissage initial du formulaire, pas une
    // frappe de l'utilisateur.
    if (premierPassage) {
      premierPassage = false
      return
    }
    if (onglet.value !== 'informations') return
    if (minuteurAutosave) clearTimeout(minuteurAutosave)
    minuteurAutosave = setTimeout(async () => {
      await appliquer(
        {
          titre: fiche.titre,
          promesse: fiche.promesse,
          pourquoi: fiche.pourquoi,
          prerequis: fiche.prerequis,
          livrable: fiche.livrable,
          pourQui: lignes(fiche.pourQui),
          acquis: lignes(fiche.acquis),
          autosave: true,
        },
        { silencieux: true },
      )
      enregistreLe.value = Date.now()
    }, DELAI_AUTOSAVE)
  },
  { deep: true },
)

let horloge: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  horloge = setInterval(() => (maintenantMs.value = Date.now()), 1000)
})
onBeforeUnmount(() => {
  if (minuteurAutosave) clearTimeout(minuteurAutosave)
  if (horloge) clearInterval(horloge)
})

const mentionAutosave = computed(() => {
  if (!enregistreLe.value) return ''
  const secondes = Math.round((maintenantMs.value - enregistreLe.value) / 1000)
  if (secondes < 60) return `Brouillon — sauvegardé il y a ${Math.max(secondes, 1)} s`
  if (secondes < 3600) return `Brouillon — sauvegardé il y a ${Math.round(secondes / 60)} min`
  return `Brouillon — sauvegardé à ${new Date(enregistreLe.value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
})

const LIBELLE_STATUT: Record<string, string> = {
  disponible: 'Vente ouverte',
  'en-preparation': 'En préparation',
  brouillon: 'Brouillon',
  annonce: 'Annonce',
}

const poids = (octets: number | null) =>
  octets ? `${Math.round(octets / 1024 / 1024)} Mo` : ''

/** Onglets de l'écran 09 : « Chapitres (3) », « Ressources (2) », « Fiche
 *  commerciale », « Offre & prix ». */
const ONGLETS = computed(() => [
  { cle: 'informations', libelle: 'Informations' },
  { cle: 'chapitres', libelle: 'Chapitres', compteur: data.value?.chapitres.length ?? 0 },
  { cle: 'ressources', libelle: 'Ressources', compteur: data.value?.ressources.length ?? 0 },
  { cle: 'fiche', libelle: 'Fiche commerciale' },
  { cle: 'offre', libelle: 'Offre & prix' },
  { cle: 'referencement', libelle: 'Référencement et partage' },
  { cle: 'historique', libelle: 'Historique' },
])

const nomThematique = computed(
  () => data.value?.thematiques.find((t) => t.id === data.value?.module.thematiqueId)?.nom ?? '',
)

const champ = 'w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] focus:border-social focus:outline-none'
</script>

<template>
  <div v-if="data">
    <NuxtLink to="/admin/contenus" class="text-[13px] text-discret hover:underline">← Modules &amp; chapitres</NuxtLink>

    <div class="mt-3 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="font-title text-[26px] font-light">
          Module {{ String(data.module.numero).padStart(2, '0') }} · {{ data.module.titre }}
        </h1>
        <p class="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-discret">
          <span
            class="rounded-full px-2.5 py-1 text-[11px] font-bold"
            :class="{
              'bg-succes-voile text-succes': data.module.statut === 'disponible',
              'bg-alerte-voile text-alerte': data.module.statut === 'en-preparation',
              'bg-fond-voile text-discret': data.module.statut === 'brouillon',
            }"
          >
            {{ LIBELLE_STATUT[data.module.statut] ?? data.module.statut }}
          </span>
          <span
            v-if="data.module.pretLe"
            class="rounded-full bg-succes-voile px-2.5 py-1 text-[11px] font-bold text-succes"
          >
            Prêt
          </span>
          <span>{{ data.module.programme === 'social-media' ? 'Social Média' : 'Entrepreneurs' }}</span>
          <span>·</span>
          <span>{{ nomThematique }}</span>
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span
          v-if="mentionAutosave"
          class="rounded-full bg-[#fff4e2] px-3 py-1.5 text-[12.5px] font-bold text-[#a06a12]"
          role="status"
        >
          {{ mentionAutosave }}
        </span>
        <UiBaseButton
          :to="`/apercu/${data.module.slug}`"
          variante="contour"
          taille="sm"
          cible="_blank"
        >
          Prévisualiser
        </UiBaseButton>
        <!-- « Prêt » est refusé côté serveur si la checklist ne passe pas : le
             bouton reste actif pour que le motif s'affiche plutôt que de
             laisser deviner pourquoi il ne se passe rien. -->
        <UiBaseButton taille="sm" :variante="data.module.pretLe ? 'contour' : undefined" @click="basculerPret">
          {{ data.module.pretLe ? 'Retirer « Prêt »' : 'Marquer « Prêt »' }}
        </UiBaseButton>
      </div>
    </div>

    <p v-if="erreur" class="mt-4 rounded-[10px] border border-erreur bg-[#fdeeee] px-4 py-3 text-[14px] text-erreur">{{ erreur }}</p>
    <p v-if="succes" class="mt-4 rounded-[10px] border border-succes bg-succes-voile px-4 py-3 text-[14px] text-succes">{{ succes }}</p>

    <UiOnglets
      class="mt-5"
      :onglets="ONGLETS"
      :model-value="onglet"
      @update:model-value="onglet = $event as Onglet"
    />

    <!-- Informations -->
    <section v-if="onglet === 'informations'" class="mt-6 max-w-[760px]">
      <div class="flex flex-col gap-4">
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Titre du module</span>
          <input v-model="fiche.titre" :class="champ">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">La promesse</span>
          <textarea v-model="fiche.promesse" rows="2" :class="champ" />
          <span class="mt-1 block text-[12px] text-discret">Sous le titre, en une phrase — le bénéfice concret.</span>
        </label>
        <div class="block">
          <span id="champ-pourquoi" class="mb-1.5 block text-[13px] font-bold">Pourquoi ce module ?</span>
          <UiChampTexteRiche
            v-model="fiche.pourquoi"
            :hauteur="160"
            placeholder="Ce que ce module apporte, et à qui…"
            aria-labelledby="champ-pourquoi"
          />
        </div>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Pour qui ?</span>
          <textarea v-model="fiche.pourQui" rows="3" :class="champ" />
          <span class="mt-1 block text-[12px] text-discret">Une ligne = une puce sur la fiche publique.</span>
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Prérequis</span>
          <input v-model="fiche.prerequis" :class="champ">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Les objectifs du module</span>
          <textarea v-model="fiche.acquis" rows="3" :class="champ" />
          <span class="mt-1 block text-[12px] text-discret">Une ligne = un objectif.</span>
        </label>
        <div class="block">
          <span id="champ-livrable" class="mb-1.5 block text-[13px] font-bold">Ce que vous construisez pendant le module</span>
          <UiChampTexteRiche
            v-model="fiche.livrable"
            :hauteur="110"
            placeholder="Le livrable concret, à la fin du module…"
            aria-labelledby="champ-livrable"
          />
        </div>
      </div>
      <UiBaseButton class="mt-5" taille="sm" :disabled="enCours" @click="enregistrerFiche">
        {{ enCours ? 'Enregistrement…' : 'Enregistrer' }}
      </UiBaseButton>
    </section>

    <!-- Chapitres -->
    <section v-if="onglet === 'chapitres'" class="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-[1fr_380px]">
      <div>
        <AdminChecklistPret :checklist="data.checklist" />

        <div v-if="data.chapitres.length" class="mt-4 flex flex-col gap-2">
          <article
            v-for="(c, i) in data.chapitres"
            :key="c.id"
            class="rounded-[12px] border bg-white p-4"
            :class="chapitreSelectionne === c.id ? 'border-social' : 'border-ligne-douce'"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <button class="min-w-0 flex-1 text-left" @click="chapitreSelectionne = c.id">
                <p class="text-[14px] font-bold text-encre">
                  <span class="text-discret">⋮⋮</span> {{ c.libelle }} · {{ c.titre }}
                </p>
                <!-- Ligne d'état : trois cas seulement, et le plus utile est le
                     dernier — ce qu'il reste à faire sur ce chapitre. -->
                <p
                  class="mt-0.5 text-[12.5px]"
                  :class="c.depotEnCours ? 'font-bold text-alerte' : c.videoCle ? 'text-succes' : 'text-discret'"
                >
                  <template v-if="c.depotEnCours">
                    Téléversement en cours — {{ c.depotEnCours.nomFichier }}
                    ({{ c.depotEnCours.parts.length }}/{{ c.depotEnCours.nbParts }} parts)
                  </template>
                  <template v-else-if="c.videoCle">
                    Vidéo : {{ c.videoNomFichier ?? c.videoCle }}
                    <template v-if="c.videoDureeSecondes"> · {{ Math.round(c.videoDureeSecondes / 60) }} min</template>
                    <template v-if="poids(c.videoTailleOctets)"> · {{ poids(c.videoTailleOctets) }}</template>
                    · {{ c.nbLignesScript ? 'script importé ✓' : 'script à importer' }}
                  </template>
                  <template v-else>
                    Aucune vidéo · {{ c.nbLignesScript ? 'script importé ✓' : 'script à importer' }}
                  </template>
                </p>
              </button>
              <div class="flex items-center gap-1.5">
                <button class="rounded-[8px] border border-ligne px-2 py-1 text-[12px]" :disabled="i === 0" @click="deplacer(i, -1)">↑</button>
                <button class="rounded-[8px] border border-ligne px-2 py-1 text-[12px]" :disabled="i === data.chapitres.length - 1" @click="deplacer(i, 1)">↓</button>
                <button class="ml-2 text-[12.5px] text-erreur underline" @click="chapitre({ action: 'supprimer', id: c.id })">Retirer</button>
              </div>
            </div>

            <AdminDepotVideo
              v-if="chapitreSelectionne === c.id"
              class="mt-4 border-t border-ligne-claire pt-4"
              :chapitre-id="c.id"
              :module-id="data.module.id"
              :depot-en-cours="c.depotEnCours"
              @termine="refresh"
              @annule="refresh"
            />
          </article>
        </div>
        <p v-else class="mt-4 rounded-[12px] border border-dashed border-ligne p-5 text-[13.5px] text-discret">
          Aucun chapitre. Il en faut au moins un pour pouvoir ouvrir l’offre.
        </p>

        <form class="mt-4 rounded-[14px] border border-ligne-douce bg-white p-5" @submit.prevent="ajouterChapitre">
          <h3 class="font-title text-[16px] font-light">Ajouter un chapitre (illimité)</h3>
          <div class="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
            <input v-model="nouveauChapitre.libelle" placeholder="Chapitre 1" :class="champ">
            <input v-model="nouveauChapitre.titre" placeholder="Titre du chapitre" required :class="champ">
            <input v-model.number="nouveauChapitre.dureeMinutes" type="number" min="1" placeholder="min" :class="champ">
          </div>
          <UiBaseButton type="submit" taille="sm" class="mt-3">Ajouter</UiBaseButton>
        </form>
      </div>

      <AdminPanneauChapitre
        v-if="chapitreCourant"
        :chapitre="chapitreCourant"
        :numero="(data.chapitres.findIndex((c) => c.id === chapitreCourant!.id) ?? 0) + 1"
        :filigrane-actif="data.module.filigraneActif"
        :telechargement-bloque="data.module.telechargementBloque"
        @modifier="chapitre({ action: 'modifier', id: chapitreCourant!.id, ...$event })"
        @reglages="reglagesModule($event)"
        @rafraichir="refresh"
      />
    </section>

    <AdminApercuModule
      v-if="onglet === 'chapitres'"
      :module-id="data.module.id"
      :slug="data.module.slug"
    />

    <!-- Ressources -->
    <section v-if="onglet === 'ressources'" class="mt-6 max-w-[760px]">
      <div v-if="data.ressources.length" class="flex flex-col gap-2">
        <article
          v-for="r in data.ressources"
          :key="r.id"
          class="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-ligne-douce bg-white p-4"
        >
          <div class="min-w-0">
            <p class="text-[14px] font-bold text-encre">{{ r.titre }}</p>
            <p class="mt-0.5 truncate text-[12.5px] text-discret">{{ r.format }} · {{ r.url }}</p>
          </div>
          <button class="text-[12.5px] text-erreur underline" @click="ressource({ action: 'supprimer', id: r.id })">Retirer</button>
        </article>
      </div>
      <p v-else class="rounded-[12px] border border-dashed border-ligne p-5 text-[13.5px] text-discret">
        Aucune ressource. Modèles, checklists et supports remis à l’apprenant se déposent ici.
      </p>

      <form
        class="mt-4 rounded-[14px] border border-ligne-douce bg-white p-5"
        @submit.prevent="ajouterRessource"
      >
        <h3 class="font-title text-[16px] font-light">Ajouter une ressource</h3>
        <div class="mt-3 grid gap-3 sm:grid-cols-[2fr_2fr_1fr]">
          <input v-model="nouvelleRessource.titre" placeholder="Titre" required :class="champ">
          <input v-model="nouvelleRessource.url" placeholder="Lien du fichier" required :class="champ">
          <input v-model="nouvelleRessource.format" placeholder="PDF" :class="champ">
        </div>
        <UiBaseButton type="submit" taille="sm" class="mt-3">Ajouter</UiBaseButton>
      </form>
    </section>

    <!-- Fiche commerciale (écran 02B), même éditeur que /admin/fiche/[id] -->
    <section v-if="onglet === 'fiche'" class="mt-6">
      <AdminFicheCommerciale :id="data.module.id" integre @enregistre="refresh" />
    </section>

    <!-- Offre & prix -->
    <section v-if="onglet === 'offre'" class="mt-6 max-w-[620px]">
      <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Prix TTC (FCFA)</span>
          <input v-model.number="prix" type="number" min="0" step="500" :class="champ">
        </label>
        <UiBaseButton class="mt-4" taille="sm" variante="contour" @click="appliquer({ prixFcfa: prix })">
          Enregistrer le prix
        </UiBaseButton>
      </div>

      <div class="mt-4 rounded-[14px] border p-5" :class="data.peutOuvrirOffre ? 'border-succes bg-succes-voile' : 'border-alerte bg-alerte-voile'">
        <p class="text-[14px] font-bold text-encre">
          {{ data.module.statut === 'disponible' ? 'Offre ouverte' : 'Offre fermée' }}
        </p>
        <p class="mt-1.5 text-[13px] text-texte">
          <template v-if="data.peutOuvrirOffre">
            Fermer l’offre ne retire jamais les accès déjà acquis : les apprenants gardent leur
            module à vie.
          </template>
          <template v-else>
            L’ouverture est bloquée tant que la promesse, le « pourquoi » et au moins un chapitre
            ne sont pas renseignés.
          </template>
        </p>
        <div class="mt-4 flex gap-2">
          <UiBaseButton
            v-if="data.module.statut !== 'disponible'"
            taille="sm"
            :disabled="!data.peutOuvrirOffre"
            @click="appliquer({ statut: 'disponible' })"
          >
            Ouvrir l’offre
          </UiBaseButton>
          <UiBaseButton
            v-else
            taille="sm"
            variante="contour"
            @click="appliquer({ statut: 'en-preparation' })"
          >
            Fermer l’offre
          </UiBaseButton>
        </div>
      </div>
    </section>

    <!-- Historique -->
    <!-- Référencement et partage (planche C, écran 24) : même panneau que la
         liste SEO, mêmes champs, même API. -->
    <section v-if="onglet === 'referencement'" class="mt-6 max-w-[620px]">
      <AdminPanneauReferencement
        :id="data.module.id"
        :libelle="data.module.titre"
        :chemin="`/modules/${data.module.slug}`"
        :seo="data.module.seo"
        :statut="data.module.statut"
        integre
        @enregistre="refresh()"
      />
    </section>

    <section v-if="onglet === 'historique'" class="mt-6 max-w-[760px]">
      <div v-if="data.versions.length" class="flex flex-col gap-2">
        <article
          v-for="v in data.versions"
          :key="v.id"
          class="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-ligne-douce bg-white p-4"
        >
          <p class="text-[13.5px]">
            <b class="text-encre">{{ new Date(v.creeLe).toLocaleString('fr-FR') }}</b>
            <span class="text-discret"> — avant modification par {{ v.auteur }}</span>
          </p>
          <button class="text-[12.5px] underline" @click="restaurer(v.id)">Restaurer</button>
        </article>
      </div>
      <p v-else class="rounded-[12px] border border-dashed border-ligne p-5 text-[13.5px] text-discret">
        Aucune version enregistrée : ce module n’a pas encore été modifié depuis le back-office.
      </p>
    </section>
  </div>
</template>
