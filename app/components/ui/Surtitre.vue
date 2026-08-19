<script setup lang="ts">
defineProps<{ ton?: 'discret' | 'social' | 'entrepreneurs' | 'clair' }>()
</script>

<template>
  <p
    class="surtitre"
    :class="[
      ton === 'social' && 'text-social',
      ton === 'entrepreneurs' && 'text-entrepreneurs',
      ton === 'clair' && 'text-social-clair',
      (!ton || ton === 'discret') && 'text-discret',
    ]"
  >
    <slot />
  </p>
</template>
