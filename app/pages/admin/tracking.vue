<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Tracking & pixels')

/**
 * Écran 19. Le contenu vit dans `AdminVoletTracking`, que le volet homonyme
 * de Paramètres (écran 20) rend aussi : une seule implémentation.
 */
</script>

<template>
  <div>
    <h1 class="font-title text-[23px] font-light">Tracking &amp; pixels</h1>
    <AdminVoletTracking class="mt-1.5" />
  </div>
</template>
