<script setup lang="ts">
definePageMeta({ layout: false, middleware: 'auth' })

const route = useRoute()
</script>

<template>
  <EspaceSalleSession :id="String(route.params.id)" espace="apprenant" />
</template>
