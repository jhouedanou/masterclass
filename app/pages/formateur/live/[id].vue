<script setup lang="ts">
/**
 * Salle du formateur pour sa Live Session : même écran que l'inscrit, en
 * rôle hôte (`/api/mon-espace/live-sessions/[id]` et `/api/zoom/signature`).
 */
definePageMeta({ layout: false, middleware: 'formateur' })

const route = useRoute()
</script>

<template>
  <LiveSalle :id="String(route.params.id)" espace="formateur" />
</template>
