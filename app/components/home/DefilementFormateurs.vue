<script setup lang="ts">
import type { Formateur } from '#shared/types'

/**
 * « Nos formateurs » de l'accueil (brief du 02/11) : tous les formateurs de
 * la base défilent seuls, de droite à gauche. La liste est rendue deux fois
 * pour une boucle sans à-coup ; la copie est cachée aux lecteurs d'écran et
 * hors de l'ordre de tabulation.
 *
 * Le défilement s'arrête au survol et au focus clavier, et ne démarre pas
 * quand le système demande moins d'animations : la bande devient alors
 * défilable à la main. La durée suit le nombre de cartes, pour garder la
 * même vitesse à 7 formateurs comme à 15.
 */
const props = defineProps<{ formateurs: (Formateur & { nbModules?: number })[] }>()

const duree = computed(() => `${Math.max(20, props.formateurs.length * 6)}s`)
</script>

<template>
  <!-- Sur téléphone, la bande va d'un bord à l'autre ; dès 768 px elle reste
       dans la colonne, comme le titre. -->
  <div class="defilement relative -mx-6 overflow-hidden md:mx-0" :style="{ '--duree': duree }">
    <ul class="piste flex w-max gap-5.5 py-1" role="list">
      <li v-for="formateur in formateurs" :key="formateur.id" class="w-[260px] shrink-0">
        <CatalogueFormateurCarteSombre :formateur="formateur" class="h-full" />
      </li>
      <li
        v-for="formateur in formateurs"
        :key="`copie-${formateur.id}`"
        class="copie w-[260px] shrink-0"
        aria-hidden="true"
        inert
      >
        <CatalogueFormateurCarteSombre :formateur="formateur" class="h-full" />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.piste {
  animation: defiler var(--duree) linear infinite;
}
.defilement:hover .piste,
.defilement:focus-within .piste {
  animation-play-state: paused;
}
@keyframes defiler {
  to {
    /* La moitié de la piste, plus la moitié d'un écart : la copie prend la
       place exacte de l'original. */
    transform: translateX(calc(-50% - 0.6875rem));
  }
}
@media (prefers-reduced-motion: reduce) {
  .defilement {
    overflow-x: auto;
  }
  .piste {
    animation: none;
  }
  .copie {
    display: none;
  }
}
</style>
