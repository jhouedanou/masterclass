<script setup lang="ts">
import type { MailleAriane } from '~/composables/useFilAriane'

/** `clair` : version pour fond sombre (hero programme en dégradé). */
defineProps<{ mailles: MailleAriane[]; clair?: boolean }>()
</script>

<template>
  <nav aria-label="Fil d’Ariane" class="text-[13px]" :class="clair ? 'text-white/70' : 'text-discret'">
    <ol class="flex flex-wrap items-center gap-2">
      <li v-for="(maille, i) in mailles" :key="i" class="flex items-center gap-2">
        <NuxtLink
          v-if="maille.chemin"
          :to="maille.chemin"
          class="hover:underline"
          :class="clair ? 'text-white/80 hover:text-white' : 'text-discret'"
        >
          {{ maille.libelle }}
        </NuxtLink>
        <span v-else aria-current="page" :class="clair ? 'text-white' : 'text-encre'">{{ maille.libelle }}</span>
        <span v-if="i < mailles.length - 1" aria-hidden="true">/</span>
      </li>
    </ol>
  </nav>
</template>
