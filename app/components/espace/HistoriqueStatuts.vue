<script setup lang="ts">
import type { HistoriqueCoachingPrive } from '#shared/types'

/** Suivi daté d'une demande (planche B, écran 10) — du plus ancien au plus récent. */
defineProps<{ entrees: HistoriqueCoachingPrive[] }>()
</script>

<template>
  <ol class="relative ml-2 border-l border-ligne pl-5">
    <li v-for="(entree, i) in entrees" :key="entree.id" class="relative pb-4 last:pb-0">
      <span
        class="absolute -left-[27px] top-1 size-3 rounded-full border-2 border-white"
        :class="i === entrees.length - 1 ? 'bg-social' : 'bg-ligne'"
        aria-hidden="true"
      />
      <p class="text-[12px] text-discret">{{ formatDateHeure(entree.creeLe) }} · {{ entree.auteur }}</p>
      <p class="text-[13.5px] font-bold text-encre">{{ LIBELLES_COACHING_PRIVE[entree.statut] }}</p>
      <p v-if="entree.commentaire" class="mt-0.5 text-[13px] text-texte">{{ entree.commentaire }}</p>
    </li>
  </ol>
</template>
