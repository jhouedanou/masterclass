<script setup lang="ts">
import type { Article, Formateur, Module } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Administration')

const { data: modules } = await useFetch<Module[]>('/api/modules')
const { data: formateurs } = await useFetch<Formateur[]>('/api/formateurs')
const { data: articles } = await useFetch<Article[]>('/api/articles')
const { data: seo } = await useFetch<{ manquants: string[]; doublons: { titles: unknown[]; descriptions: unknown[] } }>(
  '/api/admin/referencement',
)

const alertes = computed(() => {
  const liste: string[] = []
  for (const chemin of seo.value?.manquants ?? []) {
    liste.push(`Title ou Meta description manquant sur ${chemin}`)
  }
  if (seo.value?.doublons.titles.length) liste.push('Des Title sont dupliqués entre plusieurs pages')
  if (seo.value?.doublons.descriptions.length) liste.push('Des Meta descriptions sont dupliquées')
  return liste
})
</script>

<template>
  <div>
    <h1 class="text-2xl">Vue d’ensemble</h1>

    <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="carte in [
        { libelle: 'Modules', valeur: modules?.length ?? 0, chemin: '/admin/modules' },
        { libelle: 'Formateurs', valeur: formateurs?.length ?? 0, chemin: '/admin/formateurs' },
        { libelle: 'Articles publiés', valeur: articles?.length ?? 0, chemin: '/admin/blog' },
        { libelle: 'Alertes SEO', valeur: alertes.length, chemin: '/admin/referencement' },
      ]" :key="carte.libelle" class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <p class="text-sm text-texte">{{ carte.libelle }}</p>
        <p class="mt-1 font-title text-3xl font-semibold">{{ carte.valeur }}</p>
        <NuxtLink :to="carte.chemin" class="mt-3 inline-block text-xs text-texte underline">Gérer</NuxtLink>
      </div>
    </div>

    <section v-if="alertes.length" class="mt-8 rounded-[14px] border border-amber-300 bg-amber-50 p-5">
      <h2 class="font-title text-lg text-amber-900">Points à traiter avant publication</h2>
      <ul class="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-800">
        <li v-for="alerte in alertes" :key="alerte">{{ alerte }}</li>
      </ul>
      <NuxtLink to="/admin/referencement" class="mt-4 inline-block text-sm font-medium text-amber-900 underline">
        Ouvrir l’onglet Référencement
      </NuxtLink>
    </section>
  </div>
</template>
