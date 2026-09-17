<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Administration des accès')

/**
 * Écrans 07 et 07b. Le contenu — titre de page compris, la maquette le pose
 * au-dessus des trois rôles — vit dans `AdminVoletAcces`.
 */
</script>

<template>
  <AdminVoletAcces />
</template>
