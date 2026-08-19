<script setup lang="ts">
import type { Formateur, Module } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Modules — administration')

const { data: modules } = await useFetch<(Module & { formateur: Formateur | null })[]>('/api/modules')
</script>

<template>
  <div>
    <h1 class="text-2xl">Modules</h1>
    <p class="mt-2 text-sm text-texte">
      Création et édition du contenu pédagogique. Les champs de référencement se gèrent dans
      l’onglet dédié.
    </p>

    <AdminTableauSimple class="mt-6" :colonnes="['Titre', 'Programme', 'Formateur', 'Durée', 'Prix', 'Statut', '']">
      <tr v-for="module in modules" :key="module.id">
        <td class="px-4 py-3 font-medium">{{ module.titre }}</td>
        <td class="px-4 py-3">{{ module.programme === 'entrepreneurs' ? 'Entrepreneurs' : 'Social Média' }}</td>
        <td class="px-4 py-3">{{ module.formateur?.nom }}</td>
        <td class="px-4 py-3">{{ formatDuree(module.dureeMinutes) }}</td>
        <td class="px-4 py-3">{{ formatFcfa(module.prixFcfa, true) }}</td>
        <td class="px-4 py-3">
          <span
            class="rounded-full px-2.5 py-1 text-[11px] font-bold"
            :class="module.statut === 'disponible' ? 'bg-succes-voile text-succes' : 'bg-alerte-voile text-alerte'"
          >{{ module.statut }}</span>
        </td>
        <td class="px-4 py-3 text-right">
          <NuxtLink :to="`/modules/${module.slug}`" class="text-xs underline">Voir</NuxtLink>
        </td>
      </tr>
    </AdminTableauSimple>
  </div>
</template>
