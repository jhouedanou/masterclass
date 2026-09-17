<script setup lang="ts">
/**
 * Surtitre des sections. `taille` suit la maquette : `page` (13 px) sur
 * l'accueil et les pages programme, `section` (12,5 px) sur les autres pages
 * publiques, et la valeur de base — 11,5 px — au back-office.
 */
defineProps<{
  ton?: 'discret' | 'social' | 'entrepreneurs' | 'clair'
  taille?: 'page' | 'section'
}>()
</script>

<template>
  <p
    class="surtitre"
    :class="[
      taille === 'page' && 'surtitre-page',
      taille === 'section' && 'surtitre-section',
      ton === 'social' && 'text-social',
      ton === 'entrepreneurs' && 'text-entrepreneurs',
      ton === 'clair' && 'text-social-clair',
      (!ton || ton === 'discret') && 'text-discret',
    ]"
  >
    <slot />
  </p>
</template>
