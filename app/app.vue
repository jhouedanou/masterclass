<script setup lang="ts">
const auth = useAuthStore()

// Session restaurée au premier rendu, côté serveur comme côté client.
await useAsyncData('session', async () => {
  await auth.rafraichir()
  return null
})
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
