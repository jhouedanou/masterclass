<script setup lang="ts">
defineProps<{
  checklist: {
    pret: boolean
    manques: string[]
    details: {
      chapitres: number
      avecVideo: number
      avecScript: number
      dureeMinutes: number
      dureeCibleMinutes: number
    }
  }
}>()

const marque = (fait: boolean) => (fait ? '✓' : '')
</script>

<template>
  <!-- Écran 09 : un simple encart ambre en bas de la colonne, pas un bandeau
       d'alerte — la checklist informe, elle n'interdit rien. -->
  <div
    class="rounded-[12px] border px-4 py-[13px] text-[12.5px] leading-[1.6]"
    :class="checklist.pret ? 'border-succes-bordure bg-succes-pale text-succes-fonce' : 'border-alerte-bordure bg-alerte-pale text-alerte-fonce'"
  >
    <p>
      Checklist avant « Prêt » :
      {{ checklist.details.chapitres }} chapitre{{ checklist.details.chapitres > 1 ? 's' : '' }} ·
      vidéos {{ checklist.details.avecVideo }}/{{ checklist.details.chapitres }}
      {{ marque(checklist.details.avecVideo === checklist.details.chapitres && checklist.details.chapitres > 0) }} ·
      scripts {{ checklist.details.avecScript }}/{{ checklist.details.chapitres }}
      {{ marque(checklist.details.avecScript === checklist.details.chapitres && checklist.details.chapitres > 0) }} ·
      durée {{ checklist.details.dureeMinutes }}/{{ checklist.details.dureeCibleMinutes }} min
    </p>
    <p v-if="!checklist.pret" class="mt-1.5">
      Il manque encore {{ checklist.manques.join(', ') }}.
    </p>
    <p v-else class="mt-1.5">
      Tout y est. « Prêt » ne met pas le module en vente : l’ouverture de l’offre reste une
      décision distincte.
    </p>
  </div>
</template>
