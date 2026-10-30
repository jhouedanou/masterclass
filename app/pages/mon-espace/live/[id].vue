<script setup lang="ts">
definePageMeta({ layout: false, middleware: 'auth' })

const route = useRoute()
</script>

<template>
  <LiveSalle :id="String(route.params.id)" espace="apprenant" />
</template>
