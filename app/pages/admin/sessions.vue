<script setup lang="ts">
import type { Formateur, SessionCoaching, Thematique } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Sessions — administration')

const { data: sessions } = await useFetch<
  (SessionCoaching & { thematique: Thematique | null; formateur: Formateur | null })[]
>('/api/sessions')
</script>

<template>
  <div>
    <h1 class="font-title text-[24px] font-light">Calendrier des sessions</h1>
    <p class="mt-2 text-[13.5px] text-discret">
      Sessions de coaching collectif : 2 heures, 25 places, organisées par thématique.
    </p>

    <AdminTableauSimple
      class="mt-6"
      :colonnes="['Thématique', 'Programme', 'Formateur', 'Date', 'Places', 'Statut']"
    >
      <tr v-for="session in sessions" :key="session.id">
        <td class="px-4 py-3 font-bold">{{ session.thematique?.nom }}</td>
        <td class="px-4 py-3">
          {{ session.programme === 'social-media' ? 'Social Média' : 'Entrepreneurs' }}
        </td>
        <td class="px-4 py-3">{{ session.formateur?.nom }}</td>
        <td class="px-4 py-3">{{ formatDate(session.date) }} · {{ session.heure }}</td>
        <td class="px-4 py-3">{{ session.inscrits }} / {{ session.places }}</td>
        <td class="px-4 py-3">
          <span class="rounded-full bg-succes-voile px-2.5 py-1 text-[11px] font-bold text-succes">
            {{ session.statut }}
          </span>
        </td>
      </tr>
    </AdminTableauSimple>
  </div>
</template>
