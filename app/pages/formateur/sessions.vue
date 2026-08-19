<script setup lang="ts">
definePageMeta({ layout: 'formateur', middleware: 'formateur' })
usePagePrivee('Mes sessions — formateur')

const { data: sessions } = await useFetch<
  {
    id: string
    date: string
    heure: string
    inscrits: number
    places: number
    statut: string
    participation: number | null
    note: number | null
    thematique: { nom: string } | null
  }[]
>('/api/formateur/sessions')
</script>

<template>
  <div>
    <h1 class="font-title text-[26px] font-light">Mes sessions de coaching</h1>
    <p class="mt-2 text-[13.5px] text-discret">
      Le planning est fixé par l’équipe Big Five. La présence est pointée automatiquement ; les
      notes proviennent de l’évaluation post-session des apprenants.
    </p>

    <AdminTableauSimple
      class="mt-6"
      :colonnes="['Date · Heure', 'Session', 'Inscrits', 'Participation', 'Notes']"
    >
      <tr v-for="session in sessions" :key="session.id">
        <td class="px-4 py-3 font-bold">{{ formatDate(session.date) }} · {{ session.heure }}</td>
        <td class="px-4 py-3">{{ session.thematique?.nom }}</td>
        <td class="px-4 py-3">{{ session.inscrits }} / {{ session.places }}</td>
        <td class="px-4 py-3">
          {{ session.participation ? `${session.participation} % présents` : 'à venir' }}
        </td>
        <td class="px-4 py-3">
          <span v-if="session.note">{{ session.note.toString().replace('.', ',') }} ★</span>
          <span v-else class="text-discret">{{ session.inscrits }} sujets →</span>
        </td>
      </tr>
    </AdminTableauSimple>
  </div>
</template>
