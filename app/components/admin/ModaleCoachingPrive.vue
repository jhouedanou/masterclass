<script setup lang="ts">
/**
 * « Activer le coaching privé pour X ? » (planche C, écran 07b) — partagée par
 * l'écran Formateurs et l'administration des accès. L'activation engage un
 * tarif et ouvre une section entière de l'espace formateur : elle se confirme.
 */
defineProps<{
  formateur: { id: string; nom: string; coachingPriveFcfaHeure: number }
  enCours?: boolean
}>()
const emit = defineEmits<{ confirmer: []; annuler: [] }>()
</script>

<template>
  <div class="fixed inset-0 z-50 grid place-items-center bg-encre/50 p-4">
    <div class="w-full max-w-[460px] rounded-carte bg-white p-[26px] shadow-[0_16px_40px_rgba(23,21,28,.12)]">
      <h2 class="font-sans text-[16px] font-bold">
        Activer le coaching privé pour {{ formateur.nom }} ?
      </h2>
      <ul class="mt-4 space-y-1.5 text-[13.5px] text-texte">
        <li>✓ La section Coaching privé apparaît dans son dashboard formateur</li>
        <li>✓ Son profil /formateurs affiche « Coaching privé : {{ formatFcfa(formateur.coachingPriveFcfaHeure) }} / h »</li>
        <li>✓ Les apprenants peuvent le choisir dans une demande de coaching</li>
        <li>✓ Il est notifié par email + WhatsApp</li>
      </ul>
      <div class="mt-5 flex flex-wrap gap-2">
        <UiBaseButton taille="sm" :disabled="enCours" @click="emit('confirmer')">Activer</UiBaseButton>
        <UiBaseButton taille="sm" variante="contour" @click="emit('annuler')">Annuler</UiBaseButton>
      </div>
      <p class="mt-4 text-[12px] text-discret">
        Réversible (« Repasser simple ») — les séances déjà payées restent honorées. Action
        journalisée, réservée aux admins avec le droit « Administration des accès ».
      </p>
    </div>
  </div>
</template>
