<script setup lang="ts">
import type { Formateur } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Modules & chapitres — administration')

interface ChapitreArbre {
  libelle: string
  titre: string
  script: boolean
  video: boolean
}
interface ModuleArbre {
  id: string
  slug: string
  numero: number
  titre: string
  statut: string
  nbChapitres: number
  nbScripts: number
  nbVideos: number
  chapitres: ChapitreArbre[]
  videoIntro: boolean
  formateur: string
  fiche: string
  contenu: string
  offre: string
  pretLe: string | null
  offreOuverteLe: string | null
  dateLancement: string | null
  prixFcfa: number
}
interface ThematiqueArbre {
  id: string
  numero: number
  nom: string
  statut: string
  position: number
  modules: ModuleArbre[]
}
interface PhaseArbre {
  id: string
  numero: number
  nom: string
  statut: string
  dateOuverture: string | null
  thematiques: ThematiqueArbre[]
}
interface ProgrammeArbre {
  id: string
  slug: string
  nom: string
  couleur: string
  statut: string
  phases: PhaseArbre[]
}

const { data: arbre, refresh } = await useFetch<ProgrammeArbre[]>('/api/admin/contenus')
const { data: formateurs } = await useFetch<Formateur[]>('/api/formateurs')

const erreur = ref('')
const enCours = ref(false)

async function appeler(chemin: string, body: Record<string, unknown>) {
  erreur.value = ''
  enCours.value = true
  try {
    await $fetch(chemin, { method: 'POST', body })
    await refresh()
    return true
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'L’enregistrement a échoué.'
    return false
  } finally {
    enCours.value = false
  }
}

// --- Navigation dans l'arbre ------------------------------------------------

const programmeActif = ref('social-media')
const programme = computed(() => arbre.value?.find((p) => p.slug === programmeActif.value))

const phaseActive = ref('')
const phase = computed(
  () => programme.value?.phases.find((ph) => ph.id === phaseActive.value) ?? programme.value?.phases[0],
)
/** Les phases suivantes s'affichent en rappel sous l'arbre, comme la maquette
 *  le montre pour « Phase 2 · Thématiques 4 à 7 ». */
const phasesSuivantes = computed(
  () => programme.value?.phases.filter((ph) => ph.id !== phase.value?.id) ?? [],
)

watchEffect(() => {
  if (programme.value && !programme.value.phases.some((ph) => ph.id === phaseActive.value)) {
    phaseActive.value = programme.value.phases[0]?.id ?? ''
  }
})

const thematiqueOuverte = ref('')
watchEffect(() => {
  if (phase.value && !phase.value.thematiques.some((t) => t.id === thematiqueOuverte.value)) {
    thematiqueOuverte.value = phase.value.thematiques[0]?.id ?? ''
  }
})

const moduleSelectionne = ref<ModuleArbre | null>(null)
// L'arbre est rechargé après chaque écriture : sans cette resynchronisation, le
// panneau de droite continuerait d'afficher l'état d'avant.
watchEffect(() => {
  if (!moduleSelectionne.value) return
  const frais = programme.value?.phases
    .flatMap((ph) => ph.thematiques)
    .flatMap((t) => t.modules)
    .find((m) => m.id === moduleSelectionne.value?.id)
  moduleSelectionne.value = frais ?? null
})

// --- Création ---------------------------------------------------------------

type Panneau = '' | 'nouveau-programme' | 'phase' | 'thematique' | 'module'
const panneau = ref<Panneau>('')
function basculer(cible: Panneau) {
  panneau.value = panneau.value === cible ? '' : cible
}

const nouvellePhase = reactive({ nom: '', dateOuverture: '' })
async function creerPhase() {
  if (!nouvellePhase.nom.trim()) return
  const ok = await appeler('/api/admin/phases', {
    action: 'creer',
    programme: programmeActif.value,
    nom: nouvellePhase.nom,
    dateOuverture: nouvellePhase.dateOuverture || null,
  })
  if (ok) {
    Object.assign(nouvellePhase, { nom: '', dateOuverture: '' })
    panneau.value = ''
  }
}

const nouvelleThematique = reactive({ nom: '' })
async function creerThematique() {
  if (!nouvelleThematique.nom.trim() || !phase.value) return
  const ok = await appeler('/api/admin/thematiques', {
    action: 'creer',
    nom: nouvelleThematique.nom,
    programme: programmeActif.value,
    phaseId: phase.value.id,
  })
  if (ok) {
    nouvelleThematique.nom = ''
    panneau.value = ''
  }
}

/**
 * « + Nouveau programme » (écran 02) : un programme vide en brouillon — nom,
 * couleur d'accent, slug. Le slug se déduit du nom tant qu'il n'a pas été
 * touché à la main.
 */
const nouveauProgramme = reactive({ nom: '', couleur: '#6d28d9', slug: '' })
const slugProgrammeManuel = ref(false)
watch(() => nouveauProgramme.nom, (nom) => {
  if (slugProgrammeManuel.value) return
  nouveauProgramme.slug = nom
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
})
async function creerProgramme() {
  if (!nouveauProgramme.nom.trim() || !nouveauProgramme.slug) return
  const ok = await appeler('/api/admin/programmes', { action: 'creer', ...nouveauProgramme })
  if (ok) {
    programmeActif.value = nouveauProgramme.slug
    Object.assign(nouveauProgramme, { nom: '', couleur: '#6d28d9', slug: '' })
    slugProgrammeManuel.value = false
    panneau.value = ''
  }
}

const creation = reactive({ titre: '', slug: '', numero: 1, thematiqueId: '', formateurId: '' })

// L'URL suit le titre tant qu'elle n'a pas été retouchée à la main.
watch(() => creation.titre, (titre) => {
  creation.slug = titre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
})

async function creerModule() {
  erreur.value = ''
  enCours.value = true
  try {
    const cree = await $fetch<{ id: string }>('/api/admin/modules', {
      method: 'POST',
      body: { ...creation },
    })
    await refresh()
    await navigateTo(`/admin/module/${cree.id}`)
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'La création a échoué.'
  } finally {
    enCours.value = false
  }
}

// --- Publication et réordonnancement ----------------------------------------

async function publierThematique(t: ThematiqueArbre) {
  await appeler('/api/admin/thematiques', {
    action: 'modifier',
    id: t.id,
    statut: t.statut === 'publie' ? 'brouillon' : 'publie',
  })
}

/** Glisser-déposer natif : la poignée porte le déplacement, l'ordre obtenu est
 *  envoyé tel quel et fait foi. */
const tire = ref<string>('')
function deposer(cible: ThematiqueArbre) {
  if (!tire.value || tire.value === cible.id || !phase.value) return
  const ids = phase.value.thematiques.map((t) => t.id)
  const depuis = ids.indexOf(tire.value)
  const vers = ids.indexOf(cible.id)
  if (depuis < 0 || vers < 0) return
  ids.splice(vers, 0, ...ids.splice(depuis, 1))
  tire.value = ''
  appeler('/api/admin/thematiques', { action: 'reordonner', phaseId: phase.value.id, ordre: ids })
}

/** Modules : la poignée ⋮⋮ de chaque ligne (écran 02). Le nouvel ordre est
 *  envoyé tel quel ; le serveur permute les numéros déjà attribués. */
const tireModule = ref<string>('')
function deposerModule(cible: ModuleArbre, thematique: ThematiqueArbre) {
  if (!tireModule.value || tireModule.value === cible.id) return
  const ids = thematique.modules.map((m) => m.id)
  const depuis = ids.indexOf(tireModule.value)
  const vers = ids.indexOf(cible.id)
  tireModule.value = ''
  if (depuis < 0 || vers < 0) return
  ids.splice(vers, 0, ...ids.splice(depuis, 1))
  appeler('/api/admin/modules', { action: 'reordonner', ordre: ids })
}

// --- Libellés ---------------------------------------------------------------

const LIBELLES: Record<string, string> = {
  disponible: 'Disponible',
  'en-preparation': 'En préparation',
  brouillon: 'Brouillon',
  annonce: 'Annonce',
  publie: 'Publiée',
  publiee: 'Publiée',
  pret: 'Prêt',
  ouverte: 'Ouverte',
  fermee: 'Fermée',
}

const dateCourte = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''

const champ =
  'w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] focus:border-social focus:outline-none'
const pastille = 'rounded-full px-2.5 py-[3px] text-[11px] font-bold'
const pastilleModule = 'rounded-full px-2 py-[3px] text-[10.5px] font-bold'
</script>

<template>
  <div v-if="arbre">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-title text-[24px] font-light">Modules pédagogiques &amp; chapitres</h1>
      <div class="flex flex-wrap gap-2.5">
        <UiBaseButton taille="sm" variante="contour-social" @click="basculer('nouveau-programme')">+ Nouveau programme</UiBaseButton>
        <UiBaseButton taille="sm" variante="contour" @click="basculer('phase')">+ Nouvelle phase</UiBaseButton>
        <UiBaseButton taille="sm" variante="contour" @click="basculer('thematique')">+ Nouvelle thématique</UiBaseButton>
        <UiBaseButton taille="sm" variante="sombre" @click="basculer('module')">+ Nouveau module</UiBaseButton>
      </div>
    </div>

    <p v-if="erreur" class="mt-4 rounded-[10px] border border-erreur bg-[#fdeeee] px-4 py-3 text-[14px] text-erreur">{{ erreur }}</p>

    <!-- Nouveau programme : vide, en brouillon (écran 02) -->
    <form v-if="panneau === 'nouveau-programme'" class="mt-5 rounded-[14px] border border-ligne-douce bg-white p-5" @submit.prevent="creerProgramme">
      <h2 class="font-title text-[18px] font-light">Nouveau programme</h2>
      <p class="mt-1 text-[12.5px] text-discret">
        Crée un programme vide en brouillon (nom, couleur d’accent, slug) ; les thématiques
        s’ajoutent ensuite à n’importe quel programme existant.
      </p>
      <div class="mt-4 grid gap-3 sm:grid-cols-3">
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Nom</span>
          <input v-model="nouveauProgramme.nom" required :class="champ">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Couleur d’accent</span>
          <div class="flex items-center gap-2">
            <input v-model="nouveauProgramme.couleur" type="color" class="h-[42px] w-14 rounded-[10px] border border-ligne">
            <input v-model="nouveauProgramme.couleur" class="flex-1 rounded-[10px] border border-ligne px-3 py-2.5 font-mono text-[13.5px] focus:border-social focus:outline-none">
          </div>
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Slug</span>
          <input
            v-model="nouveauProgramme.slug"
            required
            pattern="[a-z0-9-]+"
            class="w-full rounded-[10px] border border-ligne px-3 py-2.5 font-mono text-[13.5px] focus:border-social focus:outline-none"
            @input="slugProgrammeManuel = true"
          >
          <span class="mt-1 block text-[12px] text-discret">/programmes/{{ nouveauProgramme.slug || '…' }}</span>
        </label>
      </div>
      <UiBaseButton type="submit" taille="sm" class="mt-4" :disabled="enCours">Créer le programme</UiBaseButton>
    </form>

    <form v-if="panneau === 'phase'" class="mt-5 rounded-[14px] border border-ligne-douce bg-white p-5" @submit.prevent="creerPhase">
      <h2 class="font-title text-[18px] font-light">Nouvelle phase</h2>
      <p class="mt-1 text-[12.5px] text-discret">
        Créée en brouillon. Une phase regroupe des thématiques et peut être programmée à une date
        d’ouverture — publier la phase ne publie aucune de ses thématiques.
      </p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Nom</span>
          <input v-model="nouvellePhase.nom" required placeholder="Phase 2" :class="champ">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Date d’ouverture <span class="font-normal text-discret">(facultatif)</span></span>
          <input v-model="nouvellePhase.dateOuverture" type="date" :class="champ">
        </label>
      </div>
      <UiBaseButton type="submit" taille="sm" class="mt-4" :disabled="enCours">Créer la phase</UiBaseButton>
    </form>

    <form v-if="panneau === 'thematique'" class="mt-5 rounded-[14px] border border-ligne-douce bg-white p-5" @submit.prevent="creerThematique">
      <h2 class="font-title text-[18px] font-light">Nouvelle thématique</h2>
      <p class="mt-1 text-[12.5px] text-discret">
        Ajoutée en brouillon à {{ phase?.nom }} du programme {{ programme?.nom }}.
      </p>
      <label class="mt-4 block max-w-[420px]">
        <span class="mb-1.5 block text-[13px] font-bold">Nom</span>
        <input v-model="nouvelleThematique.nom" required placeholder="Plateformes" :class="champ">
      </label>
      <UiBaseButton type="submit" taille="sm" class="mt-4" :disabled="enCours">Créer la thématique</UiBaseButton>
    </form>

    <form v-if="panneau === 'module'" class="mt-5 rounded-[14px] border border-ligne-douce bg-white p-5" @submit.prevent="creerModule">
      <h2 class="font-title text-[18px] font-light">Nouveau module</h2>
      <p class="mt-1 text-[12.5px] text-discret">
        Créé en brouillon : ni visible, ni indexé, ni en vente. La fiche, les chapitres et l’offre
        s’ouvrent ensuite depuis son éditeur.
      </p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <label class="block sm:col-span-2">
          <span class="mb-1.5 block text-[13px] font-bold">Titre</span>
          <input v-model="creation.titre" required :class="champ">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">URL</span>
          <input v-model="creation.slug" required placeholder="titre-du-module" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 font-mono text-[13.5px] focus:border-social focus:outline-none">
          <span class="mt-1 block text-[12px] text-discret">/modules/{{ creation.slug || '…' }}</span>
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Numéro</span>
          <input v-model.number="creation.numero" type="number" min="1" required :class="champ">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Thématique</span>
          <select v-model="creation.thematiqueId" required :class="champ">
            <optgroup v-for="ph in programme?.phases ?? []" :key="ph.id" :label="ph.nom">
              <option v-for="t in ph.thematiques" :key="t.id" :value="t.id">{{ t.nom }}</option>
            </optgroup>
          </select>
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Formateur</span>
          <select v-model="creation.formateurId" required :class="champ">
            <option v-for="f in formateurs ?? []" :key="f.id" :value="f.id">{{ f.nom }}</option>
          </select>
        </label>
      </div>
      <UiBaseButton type="submit" taille="sm" class="mt-4" :disabled="enCours">
        {{ enCours ? 'Création…' : 'Créer le module' }}
      </UiBaseButton>
    </form>

    <div class="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_460px]">
      <!-- L'arbre est une seule carte blanche : pilules de programme, sélecteur
           de phase, thématiques, modules imbriqués et note de bas de carte y
           vivent ensemble (écran 02). -->
      <div class="rounded-[14px] border border-ligne-douce bg-white p-[22px]">
        <div class="mb-4 flex flex-wrap items-center gap-2 text-[12.5px]">
          <button
            v-for="p in arbre"
            :key="p.id"
            class="rounded-full px-3.5 py-[7px]"
            :class="programmeActif === p.slug ? 'font-bold text-white' : 'border-[1.5px] border-ligne font-semibold text-texte'"
            :style="programmeActif === p.slug ? { backgroundColor: p.couleur } : undefined"
            :aria-pressed="programmeActif === p.slug"
            @click="programmeActif = p.slug"
          >
            {{ p.nom }}
          </button>
          <label class="ml-auto">
            <span class="sr-only">Phase affichée</span>
            <select
              v-model="phaseActive"
              class="rounded-full border-[1.5px] border-ligne bg-white px-3.5 py-[7px] text-[12.5px] font-semibold text-texte focus:border-social focus:outline-none"
            >
              <option v-for="ph in programme?.phases ?? []" :key="ph.id" :value="ph.id">{{ ph.nom }}</option>
            </select>
          </label>
        </div>

        <div class="flex flex-col gap-2 text-[13.5px]">
          <template v-for="thematique in phase?.thematiques" :key="thematique.id">
            <div
              class="flex items-center gap-2.5 rounded-[10px] bg-fond-clair px-3 py-2.5"
              :class="tire === thematique.id && 'ring-1 ring-social'"
              draggable="true"
              @dragstart="tire = thematique.id"
              @dragend="tire = ''"
              @dragover.prevent
              @drop.prevent="deposer(thematique)"
            >
              <button
                class="flex flex-1 items-center gap-2.5 text-left"
                :aria-expanded="thematiqueOuverte === thematique.id"
                @click="thematiqueOuverte = thematiqueOuverte === thematique.id ? '' : thematique.id"
              >
                <span aria-hidden="true" class="text-discret">{{ thematiqueOuverte === thematique.id ? '▾' : '▸' }}</span>
                <b>Thématique {{ thematique.numero }} · {{ thematique.nom }}</b>
              </button>
              <button
                :class="[pastille, thematique.statut === 'publie' ? 'bg-succes-voile text-succes' : 'bg-alerte-voile text-alerte']"
                :title="thematique.statut === 'publie' ? 'Repasser en brouillon' : 'Publier la thématique'"
                @click="publierThematique(thematique)"
              >
                {{ LIBELLES[thematique.statut] }}
              </button>
            </div>

            <!-- Modules de la thématique ouverte : indentés, bordés un à un,
                 poignée ⋮⋮ à gauche et deux pastilles à droite. -->
            <div v-if="thematiqueOuverte === thematique.id" class="ml-[26px] flex flex-col gap-1.5">
              <div
                v-for="module in thematique.modules"
                :key="module.id"
                class="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5"
                :class="moduleSelectionne?.id === module.id
                  ? 'border-[1.5px] border-social bg-social-neige'
                  : 'border border-ligne-claire'"
                @dragover.prevent
                @drop.prevent="deposerModule(module, thematique)"
              >
                <span
                  aria-hidden="true"
                  class="cursor-grab text-discret"
                  draggable="true"
                  @dragstart="tireModule = module.id"
                  @dragend="tireModule = ''"
                >⋮⋮</span>
                <button class="min-w-0 flex-1 truncate text-left" @click="moduleSelectionne = module">
                  <b v-if="moduleSelectionne?.id === module.id">Module {{ numeroModule(module.numero) }} · {{ module.titre }}</b>
                  <template v-else>Module {{ numeroModule(module.numero) }} · {{ module.titre }}</template>
                </button>
                <span class="flex shrink-0 gap-1.5">
                  <span :class="[pastilleModule, module.contenu === 'pret' ? 'bg-succes-voile text-succes' : 'bg-alerte-voile text-alerte']">
                    {{ module.contenu === 'pret' ? 'Prêt' : 'En préparation' }}
                  </span>
                  <span :class="[pastilleModule, module.offre === 'ouverte' ? 'bg-succes-voile text-succes' : 'bg-fond-voile text-discret']">
                    {{ module.offre === 'ouverte' ? 'Vente ouverte' : module.fiche === 'annonce' ? 'Teasing publié' : 'Offre fermée' }}
                  </span>
                </span>
              </div>
              <p v-if="!thematique.modules.length" class="px-3 py-2 text-[13px] text-discret">
                Aucun module dans cette thématique.
              </p>
            </div>
          </template>

          <button
            class="flex items-center gap-2.5 rounded-[10px] border-[1.5px] border-dashed border-ligne-pointillee px-3 py-2.5 text-left text-[13px] font-bold text-social"
            @click="basculer('thematique')"
          >
            ＋ Ajouter une thématique au programme {{ programme?.nom }}
          </button>

          <!-- Les phases suivantes restent dans l'arbre, en ligne repliée. -->
          <button
            v-for="ph in phasesSuivantes"
            :key="ph.id"
            class="flex items-center gap-2.5 rounded-[10px] border border-dashed border-ligne bg-fond-clair px-3 py-2.5 text-left"
            @click="phaseActive = ph.id"
          >
            <span aria-hidden="true" class="text-discret">▸</span>
            <span class="flex-1 text-discret">
              {{ ph.nom }} · {{ ph.thematiques.length }} thématique{{ ph.thematiques.length > 1 ? 's' : '' }}
            </span>
            <span :class="[pastille, 'bg-fond-voile text-discret']">
              {{ ph.dateOuverture ? `Programmée — ${dateCourte(ph.dateOuverture)}` : LIBELLES[ph.statut] }}
            </span>
          </button>
        </div>

        <p class="mt-3.5 text-[12px] leading-[1.5] text-discret">
          Glisser-déposer pour réordonner. Brouillons incomplets autorisés à tous les niveaux.
          Publier un parent ne publie jamais ses enfants. «&nbsp;+ Nouveau programme&nbsp;» crée un
          programme vide en brouillon (nom, couleur d’accent, slug) ; les thématiques s’ajoutent à
          n’importe quel programme existant.
        </p>
      </div>

      <!-- Panneau droit : les trois objets indépendants du module choisi. -->
      <aside v-if="moduleSelectionne" class="rounded-[14px] border border-ligne-douce bg-white p-[22px]">
        <p class="surtitre-menu text-discret">
          Module {{ numeroModule(moduleSelectionne.numero) }} — trois objets indépendants
        </p>

        <div class="mt-1.5 flex flex-col gap-3">
          <section class="rounded-[12px] border border-ligne-douce p-4">
            <div class="flex items-center justify-between gap-2">
              <b class="text-[14px]">Fiche commerciale</b>
              <span
                :class="[pastille, moduleSelectionne.fiche === 'publiee' ? 'bg-succes-voile text-succes' : moduleSelectionne.fiche === 'annonce' ? 'bg-alerte-voile text-alerte' : 'bg-fond-voile text-discret']"
              >
                {{ LIBELLES[moduleSelectionne.fiche] }}
              </span>
            </div>
            <p class="mt-2 text-[12.5px] leading-[1.6] text-texte">
              Titre public, accroche, visuel, FAQ, SEO/OG, badge. Publiable en teasing même si le
              module est en brouillon.
              <template v-if="moduleSelectionne.dateLancement">
                Lancement annoncé le {{ dateCourte(moduleSelectionne.dateLancement) }}.
              </template>
            </p>
            <div class="mt-2.5 flex flex-wrap gap-2 text-[12px] font-bold">
              <NuxtLink :to="`/admin/fiche/${moduleSelectionne.id}`">Modifier</NuxtLink>
              <NuxtLink :to="`/modules/${moduleSelectionne.slug}`">Prévisualiser</NuxtLink>
              <NuxtLink :to="`/admin/module/${moduleSelectionne.id}?onglet=historique`" class="text-discret">
                Historique
              </NuxtLink>
            </div>
          </section>

          <section class="rounded-[12px] border border-ligne-douce p-4">
            <div class="flex items-center justify-between gap-2">
              <b class="text-[14px]">Module pédagogique</b>
              <span
                :class="[pastille, moduleSelectionne.contenu === 'pret' ? 'bg-succes-voile text-succes' : 'bg-alerte-voile text-alerte']"
              >
                {{ LIBELLES[moduleSelectionne.contenu] }}
              </span>
            </div>
            <div class="mt-2 flex flex-col gap-[7px] text-[12.5px] text-texte">
              <div class="flex justify-between gap-3">
                <span class="min-w-0 truncate"><span aria-hidden="true">⋮⋮</span> Vidéo de bienvenue</span>
                <span class="shrink-0" :class="moduleSelectionne.videoIntro ? 'font-bold text-succes' : 'text-alerte'">
                  {{ moduleSelectionne.videoIntro ? 'Uploadée' : 'À téléverser' }}
                </span>
              </div>
              <div v-for="(c, i) in moduleSelectionne.chapitres" :key="i" class="flex justify-between gap-3">
                <span class="min-w-0 truncate"><span aria-hidden="true">⋮⋮</span> {{ c.libelle }} · {{ c.titre }}</span>
                <span class="shrink-0" :class="!c.script && 'text-discret'">
                  {{ c.script ? 'Script ✓' : 'Script à importer' }}
                </span>
              </div>
              <p v-if="!moduleSelectionne.chapitres.length" class="text-discret">Aucun chapitre.</p>
              <NuxtLink
                :to="`/admin/module/${moduleSelectionne.id}?onglet=chapitres`"
                class="text-[12.5px] font-bold"
              >
                + Ajouter un chapitre (illimité)
              </NuxtLink>
            </div>
          </section>

          <section class="rounded-[12px] border border-ligne-douce p-4">
            <div class="flex items-center justify-between gap-2">
              <b class="text-[14px]">Offre commerciale</b>
              <span
                :class="[pastille, moduleSelectionne.offre === 'ouverte' ? 'bg-succes-voile text-succes' : 'bg-fond-voile text-discret']"
              >
                {{ LIBELLES[moduleSelectionne.offre] }}
              </span>
            </div>
            <p class="mt-2 text-[12.5px] leading-[1.6] text-texte">
              {{ formatFcfa(moduleSelectionne.prixFcfa) }}<template v-if="moduleSelectionne.offreOuverteLe"> ·
              ouverte le {{ dateCourte(moduleSelectionne.offreOuverteLe) }}</template>. Ouverture
              bloquée tant que fiche non publiée ou module non «&nbsp;Prêt&nbsp;». Fermer l’offre ne
              retire jamais les accès acquis.
            </p>
          </section>
        </div>
      </aside>

      <aside v-else class="rounded-[14px] border border-dashed border-ligne bg-white p-10 text-center text-[13.5px] text-discret">
        Sélectionnez un module pour voir sa fiche, son contenu et son offre.
      </aside>
    </div>
  </div>
</template>
