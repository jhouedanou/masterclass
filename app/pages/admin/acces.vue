<script setup lang="ts">
import type { SectionAdmin } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Administration des accès')

interface Section {
  cle: SectionAdmin
  libelle: string
  note?: string
}
interface Compte {
  id: string
  nom: string
  email: string
  whatsapp: string
  role: string
  sections: SectionAdmin[] | 'toutes'
  revocable: boolean
}

const { data, refresh } = await useFetch<{
  sections: Section[]
  role: string
  mesSections: SectionAdmin[] | 'toutes'
  comptes: Compte[]
}>('/api/admin/acces')

const estSuperieur = computed(() => data.value?.role === 'admin-superieur')

/** Deux droits ne peuvent être accordés que par un administrateur supérieur. */
const RESERVEES: SectionAdmin[] = ['transactions-paiements', 'referencement-avance']
const verrouillee = (cle: SectionAdmin) => RESERVEES.includes(cle) && !estSuperieur.value

// --- Création ---------------------------------------------------------------

const creation = reactive({
  ouverte: false,
  prenom: '',
  nom: '',
  email: '',
  whatsapp: '',
  motDePasse: '',
  superieur: false,
  // Aucune section n'est cochée par défaut : le compte ne verra que ce qu'on
  // lui accorde explicitement.
  sections: [] as SectionAdmin[],
})
const erreur = ref('')
const enCours = ref(false)

function basculer(cle: SectionAdmin) {
  const i = creation.sections.indexOf(cle)
  if (i === -1) creation.sections.push(cle)
  else creation.sections.splice(i, 1)
}

async function creer() {
  erreur.value = ''
  enCours.value = true
  try {
    await $fetch('/api/admin/acces', {
      method: 'POST',
      body: { action: 'creer', ...creation },
    })
    Object.assign(creation, {
      ouverte: false, prenom: '', nom: '', email: '', whatsapp: '',
      motDePasse: '', superieur: false, sections: [],
    })
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'La création a échoué.'
  } finally {
    enCours.value = false
  }
}

// --- Modification et révocation ---------------------------------------------

const edition = ref<{ id: string; sections: SectionAdmin[] } | null>(null)

function ouvrirEdition(compte: Compte) {
  edition.value = {
    id: compte.id,
    sections: compte.sections === 'toutes' ? [] : [...compte.sections],
  }
}

function basculerEdition(cle: SectionAdmin) {
  if (!edition.value) return
  const i = edition.value.sections.indexOf(cle)
  if (i === -1) edition.value.sections.push(cle)
  else edition.value.sections.splice(i, 1)
}

async function enregistrerDroits() {
  if (!edition.value) return
  erreur.value = ''
  try {
    await $fetch('/api/admin/acces', {
      method: 'POST',
      body: { action: 'droits', id: edition.value.id, sections: edition.value.sections },
    })
    edition.value = null
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'La modification a échoué.'
  }
}

const revocation = ref<Compte | null>(null)

async function revoquer() {
  if (!revocation.value) return
  try {
    await $fetch('/api/admin/acces', {
      method: 'POST',
      body: { action: 'revoquer', id: revocation.value.id },
    })
    revocation.value = null
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'La révocation a échoué.'
  }
}
</script>

<template>
  <div v-if="data">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="font-title text-[26px] font-light">Administration des accès</h1>
        <p class="mt-2 max-w-[680px] text-[13.5px] text-discret">
          Trois rôles distincts. Les comptes d’administration se paramètrent section par section :
          une section non cochée est <b>masquée</b>, pas seulement désactivée. Toute action de cet
          écran est journalisée.
        </p>
      </div>
      <UiBaseButton taille="sm" @click="creation.ouverte = !creation.ouverte">
        {{ creation.ouverte ? 'Annuler' : 'Créer un compte administrateur' }}
      </UiBaseButton>
    </div>

    <p v-if="erreur" class="mt-4 rounded-[10px] border border-erreur bg-[#fdeeee] px-4 py-3 text-[14px] text-erreur">
      {{ erreur }}
    </p>

    <!-- Création -->
    <form
      v-if="creation.ouverte"
      class="mt-6 rounded-[14px] border border-ligne-douce bg-white p-6"
      @submit.prevent="creer"
    >
      <h2 class="font-title text-[19px] font-light">Créer un compte administrateur</h2>
      <p class="mt-1 text-[12.5px] text-discret">
        Aucune section n’est cochée par défaut.
      </p>

      <div class="mt-5 grid gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Prénom</span>
          <input v-model="creation.prenom" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] focus:border-social focus:outline-none">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Nom</span>
          <input v-model="creation.nom" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] focus:border-social focus:outline-none">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">E-mail</span>
          <input v-model="creation.email" type="email" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] focus:border-social focus:outline-none">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Numéro WhatsApp</span>
          <input v-model="creation.whatsapp" type="tel" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] focus:border-social focus:outline-none">
        </label>
        <label class="block sm:col-span-2">
          <span class="mb-1.5 block text-[13px] font-bold">Mot de passe provisoire</span>
          <input v-model="creation.motDePasse" type="password" required minlength="10" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] focus:border-social focus:outline-none">
          <span class="mt-1.5 block text-[12px] text-discret">
            10 caractères minimum — à transmettre à la personne, qui pourra le changer.
          </span>
        </label>
      </div>

      <label v-if="estSuperieur" class="mt-5 flex items-start gap-2.5 rounded-[10px] bg-alerte-voile p-3.5">
        <input v-model="creation.superieur" type="checkbox" class="mt-0.5">
        <span class="text-[13px]">
          <b class="text-encre">Administrateur supérieur</b> — accès complet, sans cocher de section.
          À réserver aux personnes de confiance.
        </span>
      </label>

      <fieldset v-if="!creation.superieur" class="mt-5">
        <legend class="surtitre mb-3 text-discret">Sections autorisées</legend>
        <div class="grid gap-2 sm:grid-cols-2">
          <label
            v-for="section in data.sections"
            :key="section.cle"
            class="flex items-start gap-2.5 rounded-[10px] border p-3"
            :class="verrouillee(section.cle)
              ? 'border-ligne-claire bg-fond-voile opacity-60'
              : 'border-ligne-douce bg-white'"
          >
            <input
              type="checkbox"
              class="mt-0.5"
              :checked="creation.sections.includes(section.cle)"
              :disabled="verrouillee(section.cle)"
              @change="basculer(section.cle)"
            >
            <span class="text-[13px]">
              <b class="text-encre">{{ section.libelle }}</b>
              <span v-if="section.note" class="mt-0.5 block text-[12px] text-discret">{{ section.note }}</span>
              <span v-if="verrouillee(section.cle)" class="mt-0.5 block text-[12px] text-alerte">
                Réservé à un administrateur supérieur.
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <div class="mt-5 flex gap-2">
        <UiBaseButton type="submit" taille="sm" :disabled="enCours">
          {{ enCours ? 'Création…' : 'Créer le compte' }}
        </UiBaseButton>
        <UiBaseButton variante="contour" taille="sm" @click="creation.ouverte = false">Annuler</UiBaseButton>
      </div>
    </form>

    <!-- Comptes existants -->
    <AdminTableauSimple
      class="mt-6"
      :colonnes="['Compte', 'Rôle', 'Sections', '']"
    >
      <tr v-for="compte in data.comptes" :key="compte.id">
        <td class="px-4 py-3">
          <p class="font-bold">{{ compte.nom }}</p>
          <p class="text-[12px] text-discret">{{ compte.email }}</p>
        </td>
        <td class="px-4 py-3">
          <span
            class="rounded-full px-2.5 py-1 text-[11px] font-bold"
            :class="compte.role === 'admin-superieur'
              ? 'bg-social-voile text-social'
              : 'bg-fond-voile text-discret'"
          >
            {{ compte.role === 'admin-superieur' ? 'Administrateur supérieur' : 'Administrateur de contenu' }}
          </span>
        </td>
        <td class="px-4 py-3 text-[13px]">
          <span v-if="compte.sections === 'toutes'" class="text-discret">Toutes</span>
          <span v-else>{{ compte.sections.length }} / {{ data.sections.length }}</span>
        </td>
        <td class="px-4 py-3 text-right">
          <button
            v-if="compte.sections !== 'toutes'"
            class="text-[12.5px] underline"
            @click="ouvrirEdition(compte)"
          >
            Modifier les droits
          </button>
          <button
            v-if="compte.revocable"
            class="ml-3 text-[12.5px] text-erreur underline"
            @click="revocation = compte"
          >
            Révoquer
          </button>
        </td>
      </tr>
    </AdminTableauSimple>

    <!-- Édition des droits -->
    <div v-if="edition" class="mt-6 rounded-[14px] border border-social bg-white p-6">
      <h2 class="font-title text-[19px] font-light">Droits du compte</h2>
      <div class="mt-4 grid gap-2 sm:grid-cols-2">
        <label
          v-for="section in data.sections"
          :key="section.cle"
          class="flex items-start gap-2.5 rounded-[10px] border p-3"
          :class="verrouillee(section.cle)
            ? 'border-ligne-claire bg-fond-voile opacity-60'
            : 'border-ligne-douce'"
        >
          <input
            type="checkbox"
            class="mt-0.5"
            :checked="edition.sections.includes(section.cle)"
            :disabled="verrouillee(section.cle)"
            @change="basculerEdition(section.cle)"
          >
          <span class="text-[13px]"><b class="text-encre">{{ section.libelle }}</b></span>
        </label>
      </div>
      <div class="mt-5 flex gap-2">
        <UiBaseButton taille="sm" @click="enregistrerDroits">Enregistrer</UiBaseButton>
        <UiBaseButton variante="contour" taille="sm" @click="edition = null">Annuler</UiBaseButton>
      </div>
    </div>

    <!-- Révocation -->
    <div v-if="revocation" class="mt-6 rounded-[14px] border border-erreur bg-[#fdeeee] p-6">
      <h2 class="font-title text-[19px] font-light text-erreur-fonce">
        Révoquer {{ revocation.nom }} ?
      </h2>
      <p class="mt-2 max-w-[620px] text-[13.5px] text-erreur">
        Le compte perd tous ses droits et redevient un compte apprenant. Il n’est pas supprimé :
        le journal d’administration référence son nom, et un historique amputé de son auteur ne
        vaudrait plus grand-chose.
      </p>
      <div class="mt-4 flex gap-2">
        <UiBaseButton taille="sm" variante="sombre" @click="revoquer">Confirmer la révocation</UiBaseButton>
        <UiBaseButton variante="contour" taille="sm" @click="revocation = null">Annuler</UiBaseButton>
      </div>
    </div>
  </div>
</template>
