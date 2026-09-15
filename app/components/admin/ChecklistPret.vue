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
  <div
    class="rounded-[12px] border p-4 text-[13px]"
    :class="checklist.pret ? 'border-succes bg-succes-voile text-succes' : 'border-alerte bg-alerte-voile text-alerte'"
  >
    <p class="font-bold">
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
