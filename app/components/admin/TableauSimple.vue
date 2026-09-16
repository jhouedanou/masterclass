<script setup lang="ts">
/**
 * Tableau du back-office. Les maquettes dessinent chaque tableau avec des
 * largeurs de colonnes explicites — `150px 1fr 200px 130px 110px 220px` pour
 * le calendrier des sessions, par exemple : ces largeurs font partie de la
 * spécification. La maquette les obtient avec une grille de `div` faute de
 * couche de composants ; ici on garde un vrai `<table>`, qui porte la
 * sémantique de lignes et de colonnes, et on lui passe les mêmes largeurs par
 * un `<colgroup>`.
 *
 * `largeurs` accepte n'importe quelle valeur de `width` CSS, une par colonne,
 * dans l'ordre des en-têtes ; le tableau passe alors en `table-fixed`.
 */
const props = defineProps<{
  colonnes: string[]
  largeurs?: string[]
  /** Largeur minimale avant défilement horizontal. */
  largeurMin?: string
}>()

const fixe = computed(() => Boolean(props.largeurs?.length))
</script>

<template>
  <div class="overflow-x-auto rounded-[14px] border border-ligne-douce bg-white">
    <table
      class="w-full text-left text-[13.5px]"
      :class="fixe && 'table-fixed'"
      :style="{ minWidth: largeurMin ?? '640px' }"
    >
      <colgroup v-if="largeurs?.length">
        <col v-for="(largeur, i) in largeurs" :key="i" :style="{ width: largeur }">
      </colgroup>
      <thead class="border-b border-ligne-claire bg-fond-clair text-[11.5px] tracking-[0.08em] text-discret uppercase">
        <tr>
          <th v-for="colonne in colonnes" :key="colonne" class="px-4 py-3 font-bold">{{ colonne }}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-ligne-claire">
        <slot />
      </tbody>
    </table>
  </div>
</template>
