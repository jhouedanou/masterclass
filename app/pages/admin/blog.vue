<script setup lang="ts">
import type { Article, Formateur } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Blog — administration')

const { data: articles } = await useFetch<(Article & { auteur: Formateur | null })[]>('/api/admin/articles')
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl">Blog — {{ articles?.length ?? 0 }} articles</h1>
      <UiBaseButton taille="sm" to="/admin/article/nouveau">+ Nouvel article</UiBaseButton>
    </div>
    <p class="mt-2 text-sm text-texte">
      Les brouillons ne sont ni accessibles publiquement, ni indexables, ni présents dans le sitemap.
      Le référencement de chaque article se règle depuis son éditeur ou depuis la liste SEO.
    </p>

    <AdminTableauSimple class="mt-6" :colonnes="['Titre', 'Catégorie', 'Auteur', 'Publié le', 'Statut', '']">
      <tr v-for="article in articles" :key="article.id">
        <td class="px-4 py-3">
          <p class="font-medium">{{ article.titre }}</p>
          <p class="font-mono text-[11.5px] text-discret">/blog/{{ article.slug }}<span v-if="article.aLaUne"> · à la une</span></p>
        </td>
        <td class="px-4 py-3">{{ article.categorie }}</td>
        <td class="px-4 py-3">{{ article.auteur?.nom }}</td>
        <td class="px-4 py-3">{{ article.publieLe ? formatDate(article.publieLe) : '—' }}</td>
        <td class="px-4 py-3">
          <span
            class="rounded-full px-2.5 py-1 text-[11px] font-bold"
            :class="article.statut === 'publie' ? 'bg-succes-voile text-succes' : 'bg-alerte-voile text-alerte'"
          >
            {{ article.statut === 'publie' ? 'Publié' : 'Brouillon' }}
          </span>
        </td>
        <td class="px-4 py-3 text-right whitespace-nowrap">
          <NuxtLink :to="`/admin/article/${article.id}`" class="text-xs underline">Modifier</NuxtLink>
          <NuxtLink v-if="article.statut === 'publie'" :to="`/blog/${article.slug}`" class="ml-3 text-xs underline">Voir</NuxtLink>
        </td>
      </tr>
    </AdminTableauSimple>
  </div>
</template>
