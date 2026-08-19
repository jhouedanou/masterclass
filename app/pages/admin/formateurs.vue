<script setup lang="ts">
import type { CandidatureFormateur, Formateur } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Formateurs — administration')

type FormateurAdmin = Formateur & {
  nbModules: number
  nbProgrammes: number
  ordrePublic: number
  supprimable: boolean
  sessionsAVenir: number
}

const { data: formateurs } = await useFetch<FormateurAdmin[]>('/api/admin/formateurs')
const { data: candidatures } = await useFetch<CandidatureFormateur[]>('/api/admin/candidatures')

const suppression = ref<FormateurAdmin | null>(null)
const confirmation = ref('')
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-title text-[26px] font-light">
        Formateurs — {{ formateurs?.length ?? 0 }} profils
      </h1>
      <UiBaseButton taille="sm" variante="contour">+ Ajouter un formateur</UiBaseButton>
    </div>

    <p class="mt-2 max-w-[820px] text-[12.5px] text-discret">
      Le profil public (photo, bio, spécialité) est modifiable ici ; l’ordre pilote la page
      /formateurs. Tarif de coaching privé fixe à 50 000 FCFA / h pour tous. L’accès « Formateur
      simple » ou « Formateur avec coaching privé » se gère dans les paramètres.
    </p>

    <AdminTableauSimple
      class="mt-5"
      :colonnes="['Formateur', 'Modules', 'Tarif coaching', 'Ordre public', '']"
    >
      <tr v-for="f in formateurs" :key="f.id">
        <td class="px-4 py-3">
          <p class="font-bold">{{ f.nom }}</p>
          <p class="text-[12px] text-discret">{{ f.expertise }}</p>
        </td>
        <td class="px-4 py-3">{{ f.nbModules }} modules · {{ f.nbProgrammes }} programme(s)</td>
        <td class="px-4 py-3">
          {{ formatFcfa(f.coachingPriveFcfaHeure) }}/h <span class="text-discret">(fixe)</span>
        </td>
        <td class="px-4 py-3">⋮⋮ {{ f.ordrePublic }}</td>
        <td class="px-4 py-3 text-right">
          <NuxtLink :to="`/formateurs/${f.slug}`" class="mr-3 text-[12.5px] underline">Voir</NuxtLink>
          <button class="text-[12.5px] text-erreur underline" @click="suppression = f">Supprimer</button>
        </td>
      </tr>
    </AdminTableauSimple>

    <h2 class="mt-10 font-title text-[19px] font-light">
      Candidatures formateurs
      <span class="ml-2 rounded-full bg-alerte-voile px-2.5 py-1 text-[12px] font-bold text-alerte">
        {{ (candidatures ?? []).filter((c) => c.statut === 'nouvelle').length }} nouvelles
      </span>
    </h2>

    <div class="mt-4 flex flex-col gap-3">
      <article
        v-for="candidature in candidatures"
        :key="candidature.id"
        class="rounded-[14px] border border-ligne-douce bg-white p-5"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-[280px] flex-1">
            <h3 class="font-title text-[18px] font-light">
              {{ candidature.nom }} — {{ candidature.expertise }}
            </h3>
            <p class="mt-2 text-[13.5px] text-texte">« {{ candidature.message }} »</p>
            <p class="mt-1 text-[12.5px] text-discret">
              {{ candidature.whatsapp }}<span v-if="candidature.lien"> · lien joint</span>
            </p>
          </div>
          <span
            class="rounded-full px-3 py-1.5 text-[12px] font-bold"
            :class="candidature.statut === 'nouvelle' ? 'bg-alerte-voile text-alerte' : 'bg-fond-voile text-discret'"
          >
            {{ candidature.statut === 'nouvelle' ? 'Nouvelle' : 'En étude' }}
          </span>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <UiBaseButton
            taille="sm"
            variante="whatsapp"
            :href="lienWhatsApp(`Bonjour ${candidature.nom}, nous revenons vers vous au sujet de votre candidature formateur.`)"
          >
            Contacter sur WhatsApp
          </UiBaseButton>
          <UiBaseButton taille="sm" variante="contour">Marquer en étude</UiBaseButton>
          <UiBaseButton taille="sm" variante="contour">Refuser</UiBaseButton>
        </div>
      </article>
    </div>

    <div v-if="suppression" class="fixed inset-0 z-50 grid place-items-center bg-encre/50 p-4">
      <div class="w-full max-w-lg rounded-carte bg-white p-6">
        <h2 class="font-title text-[21px] font-light">Supprimer le formateur {{ suppression.nom }} ?</h2>
        <p class="mt-3 text-[14px] text-texte">
          Son profil disparaît de la page /formateurs et il ne peut plus être choisi pour un coaching
          privé.
        </p>
        <p
          v-if="!suppression.supprimable"
          class="mt-3 rounded-[10px] border border-erreur bg-[#fdeeee] p-3 text-[13.5px] text-erreur-fonce"
        >
          Impossible : {{ suppression.nbModules }} module(s) publié(s) et
          {{ suppression.sessionsAVenir }} session(s) à venir lui sont rattachés. Réassignez-les
          d’abord.
        </p>
        <template v-else>
          <label class="mt-4 block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">
              Tapez « SUPPRIMER » pour confirmer
            </span>
            <input v-model="confirmation" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
          </label>
        </template>
        <div class="mt-5 flex flex-wrap gap-2">
          <UiBaseButton
            taille="sm"
            variante="sombre"
            :disabled="!suppression.supprimable || confirmation !== 'SUPPRIMER'"
          >
            Supprimer définitivement
          </UiBaseButton>
          <UiBaseButton taille="sm" variante="contour" @click="suppression = null; confirmation = ''">
            Annuler
          </UiBaseButton>
        </div>
        <p class="mt-3 text-[12px] text-discret">
          Action journalisée, réservée aux administrateurs disposant du droit « Formateurs ».
        </p>
      </div>
    </div>
  </div>
</template>
