<script setup lang="ts">
defineProps<{ etape: 1 | 2 | 3 }>()

/**
 * Fil d'étapes du tunnel (planche A, écran 04) : trois libellés en capitales
 * séparés par des points médians, l'étape courante en violet et les autres en
 * gris d'inactif. La phase 1 en faisait trois pastilles pleines, forme que la
 * maquette réserve aux statuts.
 */
const etapes = ['Compte', 'Récapitulatif', 'Paiement']
</script>

<template>
  <ol class="flex justify-center gap-2 text-[11.5px] font-bold tracking-[0.06em] uppercase">
    <li v-for="(libelle, i) in etapes" :key="libelle" class="flex gap-2">
      <span
        :class="etape === i + 1 ? 'text-social' : 'text-inactif'"
        :aria-current="etape === i + 1 ? 'step' : undefined"
      >
        {{ i + 1 }}. {{ libelle }}
      </span>
      <span v-if="i < etapes.length - 1" aria-hidden="true" class="text-ligne-pointillee">·</span>
    </li>
  </ol>
</template>
