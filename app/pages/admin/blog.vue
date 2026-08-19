<script setup lang="ts">
import type { Article, Formateur } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Blog — administration')

const { data: articles } = await useFetch<(Article & { auteur: Formateur | null })[]>('/api/articles')
</script>

<template>
  <div>
    <h1 class="text-2xl">Blog</h1>
    <p class="mt-2 text-sm text-texte">
      Les brouillons ne sont ni accessibles publiquement, ni indexables, ni présents dans le sitemap.
    </p>

    <AdminTableauSimple class="mt-6" :colonnes="['Titre', 'Catégorie', 'Auteur', 'Publié le', 'Statut', '']">
      <tr v-for="article in articles" :key="article.id">
        <td class="px-4 py-3 font-medium">{{ article.titre }}</td>
        <td class="px-4 py-3">{{ article.categorie }}</td>
        <td class="px-4 py-3">{{ article.auteur?.nom }}</td>
        <td class="px-4 py-3">{{ formatDate(article.publieLe) }}</td>
        <td class="px-4 py-3">
          <span class="rounded-full bg-succes-voile px-2.5 py-1 text-[11px] font-bold text-succes">{{ article.statut }}</span>
        </td>
        <td class="px-4 py-3 text-right">
          <NuxtLink :to="`/blog/${article.slug}`" class="text-xs underline">Voir</NuxtLink>
        </td>
      </tr>
    </AdminTableauSimple>
  </div>
</template>
