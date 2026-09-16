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

type Panneau = '' | 'nouveau-programme' | 'programme' | 'phase' | 'thematique' | 'module'
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

const fiche = reactive({ nom: '', couleur: '' })
watchEffect(() => {
  if (!programme.value) return
  fiche.nom = programme.value.nom
  fiche.couleur = programme.value.couleur
})
async function enregistrerProgramme() {
  const ok = await appeler('/api/admin/programmes', {
    slug: programmeActif.value,
    nom: fiche.nom,
    couleur: fiche.couleur,
  })
  if (ok) panneau.value = ''
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
const pastille = 'rounded-full px-2.5 py-1 text-[11px] font-bold'
</script>

<template>
  <div v-if="arbre">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <h1 class="font-title text-[26px] font-light">Modules pédagogiques &amp; chapitres</h1>
      <div class="flex flex-wrap gap-2">
        <UiBaseButton taille="sm" variante="contour" @click="basculer('nouveau-programme')">+ Nouveau programme</UiBaseButton>
        <UiBaseButton taille="sm" variante="contour" @click="basculer('programme')">Modifier le programme</UiBaseButton>
        <UiBaseButton taille="sm" variante="contour" @click="basculer('phase')">+ Nouvelle phase</UiBaseButton>
        <UiBaseButton taille="sm" variante="contour" @click="basculer('thematique')">+ Nouvelle thématique</UiBaseButton>
        <UiBaseButton taille="sm" @click="basculer('module')">+ Nouveau module</UiBaseButton>
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

    <!-- Programme : le slug n'est pas modifiable, il est le pivot de six tables -->
    <form v-if="panneau === 'programme'" class="mt-5 rounded-[14px] border border-ligne-douce bg-white p-5" @submit.prevent="enregistrerProgramme">
      <h2 class="font-title text-[18px] font-light">Programme {{ programme?.nom }}</h2>
      <p class="mt-1 text-[12.5px] text-discret">
        Le nom et la couleur d’accent s’éditent ici. L’URL du programme, elle, est fixée par le
        modèle de données : elle nomme une valeur de type en base et sert de pivot à six tables.
        Ajouter un troisième programme demande une migration — la plateforme en compte deux.
      </p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Nom</span>
          <input v-model="fiche.nom" required :class="champ">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Couleur d’accent</span>
          <div class="flex items-center gap-2">
            <input v-model="fiche.couleur" type="color" class="h-[42px] w-14 rounded-[10px] border border-ligne">
            <input v-model="fiche.couleur" class="flex-1 rounded-[10px] border border-ligne px-3 py-2.5 font-mono text-[13.5px] focus:border-social focus:outline-none">
          </div>
        </label>
      </div>
      <UiBaseButton type="submit" taille="sm" class="mt-4" :disabled="enCours">Enregistrer</UiBaseButton>
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

    <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
      <div class="flex gap-2 rounded-full bg-white p-1.5 text-[14px] font-bold" role="group">
        <button
          v-for="p in arbre"
          :key="p.id"
          class="rounded-full px-5 py-2"
          :class="programmeActif === p.slug ? 'text-white' : 'text-texte'"
          :style="programmeActif === p.slug ? { backgroundColor: p.couleur } : undefined"
          :aria-pressed="programmeActif === p.slug"
          @click="programmeActif = p.slug"
        >
          {{ p.nom }}
        </button>
      </div>
      <label class="flex items-center gap-2 text-[13px]">
        <span class="sr-only">Phase affichée</span>
        <select v-model="phaseActive" class="rounded-[10px] border border-ligne bg-white px-3 py-2 text-[13.5px] focus:border-social focus:outline-none">
          <option v-for="ph in programme?.phases ?? []" :key="ph.id" :value="ph.id">{{ ph.nom }}</option>
        </select>
      </label>
    </div>

    <div class="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr]">
      <div class="flex flex-col gap-3">
        <article
          v-for="thematique in phase?.thematiques"
          :key="thematique.id"
          class="overflow-hidden rounded-[14px] border bg-white"
          :class="tire === thematique.id ? 'border-social' : 'border-ligne-douce'"
          @dragover.prevent
          @drop.prevent="deposer(thematique)"
        >
          <h2 class="flex items-center gap-1 px-2">
            <span
              class="cursor-grab px-2 py-4 text-[13px] text-discret"
              draggable="true"
              :aria-label="`Déplacer ${thematique.nom}`"
              @dragstart="tire = thematique.id"
              @dragend="tire = ''"
            >⋮⋮</span>
            <button
              class="flex flex-1 items-center justify-between gap-4 py-4 pr-3 text-left"
              :aria-expanded="thematiqueOuverte === thematique.id"
              @click="thematiqueOuverte = thematiqueOuverte === thematique.id ? '' : thematique.id"
            >
              <span class="font-title text-[17px] font-light">
                Thématique {{ thematique.numero }} · {{ thematique.nom }}
              </span>
              <span class="flex items-center gap-3 text-[12px] text-discret">
                <span
                  :class="[pastille, thematique.statut === 'publie' ? 'bg-succes-voile text-succes' : 'bg-alerte-voile text-alerte']"
                >
                  {{ LIBELLES[thematique.statut] }}
                </span>
                {{ thematiqueOuverte === thematique.id ? '▾' : '▸' }}
              </span>
            </button>
          </h2>

          <div v-if="thematiqueOuverte === thematique.id" class="border-t border-ligne-claire">
            <ul class="divide-y divide-ligne-claire">
              <li v-for="module in thematique.modules" :key="module.id">
                <button
                  class="flex w-full items-center justify-between gap-4 px-5 py-3 text-left hover:bg-fond-clair"
                  :class="moduleSelectionne?.id === module.id && 'bg-fond-clair'"
                  @click="moduleSelectionne = module"
                >
                  <span class="min-w-0 flex-1 truncate text-[14px]">
                    Module {{ numeroModule(module.numero) }} · {{ module.titre }}
                  </span>
                  <span class="flex shrink-0 gap-2">
                    <span
                      :class="[pastille, module.contenu === 'pret' ? 'bg-succes-voile text-succes' : 'bg-alerte-voile text-alerte']"
                    >
                      {{ module.contenu === 'pret' ? 'Prêt' : 'En préparation' }}
                    </span>
                    <span
                      :class="[pastille, module.offre === 'ouverte' ? 'bg-social-voile text-social' : 'bg-fond-voile text-discret']"
                    >
                      {{ module.offre === 'ouverte' ? 'Vente ouverte' : module.fiche === 'annonce' ? 'Teasing publié' : 'Offre fermée' }}
                    </span>
                  </span>
                </button>
              </li>
              <li v-if="!thematique.modules.length" class="px-5 py-4 text-[13px] text-discret">
                Aucun module dans cette thématique.
              </li>
            </ul>
            <div class="flex flex-wrap gap-3 border-t border-ligne-claire px-5 py-3 text-[12.5px]">
              <button class="text-social underline" @click="publierThematique(thematique)">
                {{ thematique.statut === 'publie' ? 'Repasser en brouillon' : 'Publier la thématique' }}
              </button>
            </div>
          </div>
        </article>

        <button class="rounded-[14px] border border-dashed border-ligne bg-white px-5 py-4 text-left text-[13.5px] text-social" @click="basculer('thematique')">
          ＋ Ajouter une thématique au programme {{ programme?.nom }}
        </button>

        <article
          v-for="ph in phasesSuivantes"
          :key="ph.id"
          class="rounded-[14px] border border-dashed border-ligne bg-white px-5 py-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="font-title text-[16px] font-light text-discret">
              {{ ph.nom }} · {{ ph.thematiques.length }} thématique{{ ph.thematiques.length > 1 ? 's' : '' }}
            </p>
            <span :class="[pastille, 'bg-fond-voile text-discret']">
              {{ ph.dateOuverture ? `Programmée — ${dateCourte(ph.dateOuverture)}` : LIBELLES[ph.statut] }}
            </span>
          </div>
          <button class="mt-1.5 text-[12.5px] text-social underline" @click="phaseActive = ph.id">
            Afficher cette phase
          </button>
        </article>

        <p class="text-[12.5px] text-discret">
          Glissez la poignée ⋮⋮ pour réordonner les thématiques. Les brouillons incomplets sont
          autorisés à tous les niveaux, et publier un parent ne publie jamais ses enfants.
        </p>
      </div>

      <aside v-if="moduleSelectionne" class="h-fit rounded-[14px] border border-ligne-douce bg-white p-6">
        <UiBaseButton :to="`/admin/module/${moduleSelectionne.id}`" taille="sm" class="mb-4 w-full">
          Ouvrir l’éditeur
        </UiBaseButton>
        <h2 class="font-title text-[19px] font-light">
          Module {{ numeroModule(moduleSelectionne.numero) }} — trois objets indépendants
        </h2>

        <section class="mt-5 rounded-[12px] border border-ligne-claire p-4">
          <div class="flex items-center justify-between gap-2">
            <p class="text-[14px] font-bold">Fiche commerciale</p>
            <span
              :class="[pastille, moduleSelectionne.fiche === 'publiee' ? 'bg-succes-voile text-succes' : moduleSelectionne.fiche === 'annonce' ? 'bg-alerte-voile text-alerte' : 'bg-fond-voile text-discret']"
            >
              {{ LIBELLES[moduleSelectionne.fiche] }}
            </span>
          </div>
          <p class="mt-2 text-[13px] text-texte">
            Titre public, accroche, visuel, FAQ, SEO/OG, badge. Publiable en teasing même si le
            module est en brouillon.
            <template v-if="moduleSelectionne.dateLancement">
              Lancement annoncé le {{ dateCourte(moduleSelectionne.dateLancement) }}.
            </template>
          </p>
          <div class="mt-3 flex flex-wrap gap-2 text-[12.5px]">
            <NuxtLink :to="`/admin/fiche/${moduleSelectionne.id}`" class="rounded-full border border-ligne px-3 py-1.5 text-encre">
              Modifier
            </NuxtLink>
            <NuxtLink :to="`/modules/${moduleSelectionne.slug}`" class="rounded-full border border-ligne px-3 py-1.5 text-encre">
              Prévisualiser
            </NuxtLink>
            <NuxtLink :to="`/admin/module/${moduleSelectionne.id}?onglet=historique`" class="rounded-full border border-ligne px-3 py-1.5 text-encre">
              Historique
            </NuxtLink>
          </div>
        </section>

        <section class="mt-4 rounded-[12px] border border-ligne-claire p-4">
          <div class="flex items-center justify-between gap-2">
            <p class="text-[14px] font-bold">Module pédagogique</p>
            <span
              :class="[pastille, moduleSelectionne.contenu === 'pret' ? 'bg-succes-voile text-succes' : 'bg-alerte-voile text-alerte']"
            >
              {{ LIBELLES[moduleSelectionne.contenu] }}
            </span>
          </div>
          <ul class="mt-3 flex flex-col gap-1.5">
            <li class="flex items-center justify-between gap-3 text-[13px]">
              <span class="min-w-0 truncate text-texte">
                <span class="text-discret">⋮⋮</span> Vidéo de bienvenue
              </span>
              <span class="shrink-0 text-[12px]" :class="moduleSelectionne.videoIntro ? 'text-succes' : 'text-alerte'">
                {{ moduleSelectionne.videoIntro ? '— Uploadée' : '— À téléverser' }}
              </span>
            </li>
            <li
              v-for="(c, i) in moduleSelectionne.chapitres"
              :key="i"
              class="flex items-center justify-between gap-3 text-[13px]"
            >
              <span class="min-w-0 truncate text-texte">
                <span class="text-discret">⋮⋮</span> {{ c.libelle }} · {{ c.titre }}
              </span>
              <span class="shrink-0 text-[12px]" :class="c.script ? 'text-succes' : 'text-discret'">
                {{ c.script ? 'Script ✓' : 'Script à importer' }}
              </span>
            </li>
            <li v-if="!moduleSelectionne.chapitres.length" class="text-[13px] text-discret">
              Aucun chapitre.
            </li>
          </ul>
          <p class="mt-3 text-[12.5px] text-discret">
            {{ moduleSelectionne.nbVideos }}/{{ moduleSelectionne.nbChapitres }} vidéos ·
            {{ moduleSelectionne.nbScripts }}/{{ moduleSelectionne.nbChapitres }} scripts ·
            formateur {{ moduleSelectionne.formateur }}
          </p>
          <NuxtLink :to="`/admin/module/${moduleSelectionne.id}?onglet=chapitres`" class="mt-2 inline-block text-[12.5px] text-social underline">
            + Ajouter un chapitre (illimité)
          </NuxtLink>
        </section>

        <section class="mt-4 rounded-[12px] border border-ligne-claire p-4">
          <div class="flex items-center justify-between gap-2">
            <p class="text-[14px] font-bold">Offre commerciale</p>
            <span
              :class="[pastille, moduleSelectionne.offre === 'ouverte' ? 'bg-social-voile text-social' : 'bg-fond-voile text-discret']"
            >
              {{ LIBELLES[moduleSelectionne.offre] }}
            </span>
          </div>
          <p class="mt-2 text-[13px] text-texte">
            {{ formatFcfa(moduleSelectionne.prixFcfa, true) }}. L’ouverture reste bloquée tant que la
            fiche n’est pas publiée ou le module non « Prêt ». Fermer l’offre ne retire jamais les
            accès acquis.
          </p>
        </section>
      </aside>

      <aside v-else class="h-fit rounded-[14px] border border-dashed border-ligne bg-white p-10 text-center text-[13.5px] text-discret">
        Sélectionnez un module pour voir sa fiche, son contenu et son offre.
      </aside>
    </div>
  </div>
</template>
