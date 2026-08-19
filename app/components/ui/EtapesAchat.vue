<script setup lang="ts">
defineProps<{ etape: 1 | 2 | 3 }>()
const etapes = ['Compte', 'Récapitulatif', 'Paiement']
</script>

<template>
  <ol class="flex flex-wrap items-center gap-3 text-[14px]">
    <li v-for="(libelle, i) in etapes" :key="libelle" class="flex items-center gap-3">
      <span
        class="flex items-center gap-2 rounded-full px-4 py-2 font-bold"
        :class="etape === i + 1 ? 'bg-social text-white' : etape > i + 1 ? 'bg-succes-voile text-succes' : 'bg-fond-voile text-discret'"
        :aria-current="etape === i + 1 ? 'step' : undefined"
      >
        <span>{{ i + 1 }}.</span>
        {{ libelle }}
      </span>
      <span v-if="i < etapes.length - 1" aria-hidden="true" class="text-ligne">·</span>
    </li>
  </ol>
</template>
