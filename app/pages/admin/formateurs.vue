<script setup lang="ts">
import type { Formateur } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Formateurs — administration')

const { data: formateurs } = await useFetch<(Formateur & { nbModules: number })[]>('/api/formateurs')
</script>

<template>
  <div>
    <h1 class="text-2xl">Formateurs</h1>
    <p class="mt-2 text-sm text-texte">
      Les formateurs n’ont pas de tableau de bord : leurs données publiques sont administrées ici.
    </p>

    <AdminTableauSimple class="mt-6" :colonnes="['Nom', 'Fonction', 'Modules', 'Fiche', 'Indexation']">
      <tr v-for="formateur in formateurs" :key="formateur.id">
        <td class="px-4 py-3 font-bold">{{ formateur.nom }}</td>
        <td class="px-4 py-3">{{ formateur.expertise }}</td>
        <td class="px-4 py-3">{{ formateur.nbModules }}</td>
        <td class="px-4 py-3">
          <span
            class="rounded-full px-2.5 py-1 text-[11px] font-bold"
            :class="formateur.ficheComplete ? 'bg-succes-voile text-succes' : 'bg-alerte-voile text-alerte'"
          >{{ formateur.ficheComplete ? 'Complète' : 'Incomplète' }}</span>
        </td>
        <td class="px-4 py-3">{{ formateur.seo.indexable === false ? 'noindex' : 'index' }}</td>
      </tr>
    </AdminTableauSimple>
  </div>
</template>
