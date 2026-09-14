<script setup lang="ts">
/** « 🔒 Votre profil apprenant est à 60 %. Complétez-le à 100 % pour débloquer le bouton « Rejoindre la session ». » */
defineProps<{ completion: number; bouton?: string }>()
</script>

<template>
  <p v-if="completion < 100" class="rounded-[10px] bg-fond-voile px-4 py-3 text-[13px] text-texte">
    🔒 Votre profil apprenant est à <b>{{ completion }} %</b>. Complétez-le à 100 % pour débloquer le
    bouton « {{ bouton ?? 'Rejoindre la session' }} ».
    <NuxtLink to="/mon-espace/profil" class="font-bold text-social underline">Compléter</NuxtLink>
  </p>
</template>
