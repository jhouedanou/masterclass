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
    <!-- Les écrans du back-office attendent leur `useFetch` avant de se
         rendre : sans ce filet, le changement de page reste muet plusieurs
         centaines de millisecondes. Violet du programme Social Média. -->
    <NuxtLoadingIndicator color="#80368d" :height="3" :throttle="120" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <ClientOnly>
      <LayoutBandeauPwa />
    </ClientOnly>
  </div>
</template>
