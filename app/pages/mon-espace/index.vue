<script setup lang="ts">
import type { Acces, Certificat, Formateur, Module, SessionCoaching, Thematique } from '#shared/types'

definePageMeta({ layout: 'espace', middleware: 'auth' })
usePagePrivee('Tableau de bord')

type AccesGarni = Acces & {
  module: Module | null
  formateur: Formateur | null
  thematique: Thematique | null
}

const auth = useAuthStore()
const { data: acces } = await useFetch<AccesGarni[]>('/api/mon-espace/acces')
const { data: certificats } = await useFetch<Certificat[]>('/api/certificats')
const { data: sessions } = await useFetch<(SessionCoaching & { thematique: Thematique | null })[]>(
  '/api/sessions',
)

const enCours = computed(() => (acces.value ?? []).filter((a) => a.progression < 100))
const termines = computed(() => (acces.value ?? []).filter((a) => a.progression === 100))
</script>

<template>
  <div>
    <div class="rayures-visuel-social rounded-carte p-7">
      <h1 class="text-[30px] font-medium">Bonjour {{ auth.utilisateur?.prenom }}</h1>
      <p class="mt-2 text-[15px] text-texte">Reprenez là où vous vous êtes arrêté.</p>
      <p v-if="auth.utilisateur && !auth.utilisateur.ficheCompletee" class="mt-4 text-[14px] text-alerte">
        Complétez votre fiche apprenant pour pouvoir rejoindre les sessions de coaching collectif.
      </p>
    </div>

    <div class="mt-6 grid gap-4 sm:grid-cols-3">
      <div class="rounded-[14px] border border-ligne-douce p-5">
        <p class="font-title text-[30px] font-light">{{ acces?.length ?? 0 }}</p>
        <p class="mt-1 text-[13.5px] text-discret">Module(s) acquis</p>
      </div>
      <div class="rounded-[14px] border border-ligne-douce p-5">
        <p class="font-title text-[30px] font-light">{{ termines.length }}</p>
        <p class="mt-1 text-[13.5px] text-discret">Module(s) réalisé(s)</p>
      </div>
      <div class="rounded-[14px] border border-ligne-douce p-5">
        <p class="font-title text-[30px] font-light">{{ certificats?.length ?? 0 }}</p>
        <p class="mt-1 text-[13.5px] text-discret">Certificat(s)</p>
      </div>
    </div>

    <h2 class="mt-10 font-title text-[24px] font-light">Module en cours</h2>
    <div v-if="enCours.length" class="mt-4 flex flex-col gap-3">
      <NuxtLink
        v-for="ligne in enCours"
        :key="ligne.moduleId"
        :to="`/mon-espace/module/${ligne.module?.slug}`"
        class="flex items-center gap-4 rounded-[14px] border border-ligne-douce p-5 hover:border-ligne"
      >
        <span class="grid size-12 shrink-0 place-items-center rounded-full bg-social text-white">
          <Icon name="ph:play-fill" size="20" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate font-title text-[19px] font-light">{{ ligne.module?.titre }}</span>
          <span class="mt-2 block h-1.5 w-full rounded-full bg-fond-voile">
            <span class="block h-full rounded-full bg-social" :style="{ width: `${ligne.progression}%` }" />
          </span>
          <span class="mt-1 block text-[12.5px] text-discret">{{ ligne.progression }} % réalisé</span>
        </span>
      </NuxtLink>
    </div>
    <p v-else class="mt-4 rounded-[14px] border border-dashed border-ligne p-8 text-center text-[14px] text-discret">
      Aucun module en cours.
    </p>

    <h2 class="mt-10 font-title text-[24px] font-light">Prochaines sessions</h2>
    <ul class="mt-4 flex flex-col gap-3">
      <li
        v-for="session in (sessions ?? []).slice(0, 3)"
        :key="session.id"
        class="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-ligne-douce p-5"
      >
        <span>
          <span class="block font-title text-[18px] font-light">{{ session.thematique?.nom }}</span>
          <span class="block text-[13px] text-discret">
            {{ formatDate(session.date) }} à {{ session.heure }} · {{ formatDuree(session.dureeMinutes) }}
          </span>
        </span>
        <span class="text-[13px] text-texte">{{ session.inscrits }} / {{ session.places }} places</span>
      </li>
    </ul>
  </div>
</template>
