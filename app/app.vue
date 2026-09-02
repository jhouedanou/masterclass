<script setup lang="ts">
const auth = useAuthStore()

// Session restaurée au premier rendu, côté serveur comme côté client.
await useAsyncData('session', () => auth.rafraichir())
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <ClientOnly>
      <LayoutBandeauPwa />
    </ClientOnly>
  </div>
</template>
