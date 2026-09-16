<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Administration des accès')

/**
 * Écrans 07 et 07b. Le contenu vit dans `AdminVoletAcces`, que le volet
 * homonyme de Paramètres (écran 20) rend aussi : une seule implémentation.
 */
</script>

<template>
  <div>
    <h1 class="font-title text-[26px] font-light">Administration des accès</h1>
    <AdminVoletAcces class="mt-5" />
  </div>
</template>
