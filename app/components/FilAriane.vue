<script setup lang="ts">
import type { MailleAriane } from '~/composables/useFilAriane'

defineProps<{ mailles: MailleAriane[] }>()
</script>

<template>
  <nav aria-label="Fil d’Ariane" class="text-[13px] text-discret">
    <ol class="flex flex-wrap items-center gap-2">
      <li v-for="(maille, i) in mailles" :key="i" class="flex items-center gap-2">
        <NuxtLink v-if="maille.chemin" :to="maille.chemin" class="text-discret hover:underline">
          {{ maille.libelle }}
        </NuxtLink>
        <span v-else aria-current="page" class="text-encre">{{ maille.libelle }}</span>
        <span v-if="i < mailles.length - 1" aria-hidden="true">/</span>
      </li>
    </ol>
  </nav>
</template>
