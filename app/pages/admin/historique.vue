<script setup lang="ts">
import type { EntreeJournal } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Historique — administration')

const { data: journal } = await useFetch<EntreeJournal[]>('/api/admin/journal')
</script>

<template>
  <div>
    <h1 class="font-title text-[26px] font-light">Historique & versions</h1>
    <p class="mt-2 text-[12.5px] text-discret">
      Toutes les actions sensibles sont journalisées : publication, modification de fiche,
      attribution ou révocation d’accès, changement de slug, annulation de session, modification des
      paramètres financiers.
    </p>

    <AdminTableauSimple class="mt-5" :colonnes="['Auteur', 'Action', 'Cible', 'Date']">
      <tr v-for="entree in journal" :key="entree.id">
        <td class="px-4 py-3 font-bold">{{ entree.auteur }}</td>
        <td class="px-4 py-3">{{ entree.action }}</td>
        <td class="px-4 py-3">{{ entree.cible }}</td>
        <td class="px-4 py-3 text-[12.5px] text-discret">{{ formatDate(entree.date) }}</td>
      </tr>
    </AdminTableauSimple>
  </div>
</template>
