<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

/**
 * Fiche commerciale d'un module (écran 02B). L'éditeur vit dans
 * `AdminFicheCommerciale`, que l'onglet homonyme de l'éditeur de module rend
 * aussi : une seule implémentation.
 */
const route = useRoute()
const id = computed(() => String(route.params.id))
const { data } = await useFetch<{ module: { titre: string } }>(() => `/api/admin/module/${id.value}`)
if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Module introuvable', fatal: true })
}
usePagePrivee(`${data.value.module.titre} — fiche commerciale`)
</script>

<template>
  <AdminFicheCommerciale :id="id" />
</template>
