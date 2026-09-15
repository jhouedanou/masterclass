<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Programmes & phases — administration')

interface ThematiqueArbre { id: string; nom: string; statut: string }
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

/** Édition d'un programme : le slug reste hors d'atteinte, il nomme une valeur
 *  de type en base et sert de pivot à six tables. */
const edition = ref('')
const fiche = reactive({ nom: '', couleur: '' })

function ouvrir(p: ProgrammeArbre) {
  edition.value = edition.value === p.slug ? '' : p.slug
  fiche.nom = p.nom
  fiche.couleur = p.couleur
}

async function enregistrerProgramme(slug: string) {
  if (await appeler('/api/admin/programmes', { slug, nom: fiche.nom, couleur: fiche.couleur })) {
    edition.value = ''
  }
}

const basculerProgramme = (p: ProgrammeArbre) =>
  appeler('/api/admin/programmes', {
    slug: p.slug,
    statut: p.statut === 'publie' ? 'brouillon' : 'publie',
  })

// --- Phases -----------------------------------------------------------------

const creation = reactive({ programme: '', nom: '', dateOuverture: '' })

async function creerPhase() {
  if (!creation.nom.trim() || !creation.programme) return
  const ok = await appeler('/api/admin/phases', {
    action: 'creer',
    programme: creation.programme,
    nom: creation.nom,
    dateOuverture: creation.dateOuverture || null,
  })
  if (ok) Object.assign(creation, { programme: '', nom: '', dateOuverture: '' })
}

const basculerPhase = (ph: PhaseArbre) =>
  appeler('/api/admin/phases', {
    action: 'modifier',
    id: ph.id,
    statut: ph.statut === 'publie' ? 'brouillon' : 'publie',
  })

const supprimerPhase = (ph: PhaseArbre) =>
  appeler('/api/admin/phases', { action: 'supprimer', id: ph.id })

const reprogrammer = (ph: PhaseArbre, dateOuverture: string) =>
  appeler('/api/admin/phases', { action: 'modifier', id: ph.id, dateOuverture: dateOuverture || null })

const dateCourte = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''

const champ =
  'w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] focus:border-social focus:outline-none'
const pastille = 'rounded-full px-2.5 py-1 text-[11px] font-bold'
</script>

<template>
  <div v-if="arbre">
    <h1 class="font-title text-[26px] font-light">Programmes &amp; phases</h1>
    <p class="mt-1.5 max-w-[720px] text-[13.5px] text-discret">
      Une phase regroupe des thématiques et peut être programmée à une date d’ouverture. Publier une
      phase ne publie aucune de ses thématiques, et publier un programme ne publie aucune de ses
      phases : chaque niveau se décide séparément.
    </p>

    <p v-if="erreur" class="mt-4 rounded-[10px] border border-erreur bg-[#fdeeee] px-4 py-3 text-[14px] text-erreur">{{ erreur }}</p>

    <section
      v-for="p in arbre"
      :key="p.id"
      class="mt-6 overflow-hidden rounded-[14px] border border-ligne-douce bg-white"
    >
      <header class="flex flex-wrap items-center justify-between gap-3 border-b border-ligne-claire px-6 py-5">
        <div class="flex items-center gap-3">
          <span class="h-8 w-8 shrink-0 rounded-full" :style="{ backgroundColor: p.couleur }" />
          <div>
            <h2 class="font-title text-[20px] font-light">{{ p.nom }}</h2>
            <p class="mt-0.5 font-mono text-[12px] text-discret">/programmes/{{ p.slug }}</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span :class="[pastille, p.statut === 'publie' ? 'bg-succes-voile text-succes' : 'bg-alerte-voile text-alerte']">
            {{ p.statut === 'publie' ? 'Publié' : 'Brouillon' }}
          </span>
          <button class="text-[12.5px] text-social underline" @click="ouvrir(p)">
            {{ edition === p.slug ? 'Annuler' : 'Modifier' }}
          </button>
          <button class="text-[12.5px] text-social underline" :disabled="enCours" @click="basculerProgramme(p)">
            {{ p.statut === 'publie' ? 'Repasser en brouillon' : 'Publier' }}
          </button>
        </div>
      </header>

      <form v-if="edition === p.slug" class="border-b border-ligne-claire bg-fond-voile px-6 py-5" @submit.prevent="enregistrerProgramme(p.slug)">
        <div class="grid gap-3 sm:grid-cols-2">
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
        <p class="mt-2.5 text-[12.5px] text-discret">
          L’URL du programme n’est pas modifiable : elle nomme une valeur de type en base, sert de
          pivot à six tables et décide de la couleur, du libellé et du jeu de champs du profil
          apprenant. Ajouter un troisième programme demande une migration.
        </p>
        <UiBaseButton type="submit" taille="sm" class="mt-3" :disabled="enCours">Enregistrer</UiBaseButton>
      </form>

      <ul class="divide-y divide-ligne-claire">
        <li v-for="ph in p.phases" :key="ph.id" class="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div class="min-w-0">
            <p class="text-[14.5px] font-bold text-encre">{{ ph.nom }}</p>
            <p class="mt-0.5 text-[12.5px] text-discret">
              {{ ph.thematiques.length }} thématique{{ ph.thematiques.length > 1 ? 's' : '' }}
              <template v-if="ph.dateOuverture"> · ouverture le {{ dateCourte(ph.dateOuverture) }}</template>
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <label class="flex items-center gap-2 text-[12.5px] text-discret">
              <span class="sr-only">Date d’ouverture de {{ ph.nom }}</span>
              <input
                type="date"
                :value="ph.dateOuverture ?? ''"
                class="rounded-[8px] border border-ligne px-2 py-1 text-[12.5px]"
                @change="reprogrammer(ph, ($event.target as HTMLInputElement).value)"
              >
            </label>
            <span :class="[pastille, ph.statut === 'publie' ? 'bg-succes-voile text-succes' : 'bg-alerte-voile text-alerte']">
              {{ ph.statut === 'publie' ? 'Publiée' : 'Brouillon' }}
            </span>
            <button class="text-[12.5px] text-social underline" :disabled="enCours" @click="basculerPhase(ph)">
              {{ ph.statut === 'publie' ? 'Repasser en brouillon' : 'Publier' }}
            </button>
            <button
              v-if="!ph.thematiques.length"
              class="text-[12.5px] text-erreur underline"
              :disabled="enCours"
              @click="supprimerPhase(ph)"
            >
              Supprimer
            </button>
          </div>
        </li>
      </ul>

      <form class="border-t border-ligne-claire px-6 py-4" @submit.prevent="creerPhase">
        <div class="flex flex-wrap items-end gap-3">
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold">Nouvelle phase</span>
            <input
              :value="creation.programme === p.slug ? creation.nom : ''"
              placeholder="Phase 2"
              class="rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] focus:border-social focus:outline-none"
              @input="creation.programme = p.slug; creation.nom = ($event.target as HTMLInputElement).value"
            >
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold">Ouverture <span class="font-normal text-discret">(facultatif)</span></span>
            <input
              type="date"
              :value="creation.programme === p.slug ? creation.dateOuverture : ''"
              class="rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] focus:border-social focus:outline-none"
              @input="creation.programme = p.slug; creation.dateOuverture = ($event.target as HTMLInputElement).value"
            >
          </label>
          <UiBaseButton type="submit" taille="sm" variante="contour" :disabled="enCours || creation.programme !== p.slug">
            + Ajouter la phase
          </UiBaseButton>
        </div>
      </form>
    </section>
  </div>
</template>
