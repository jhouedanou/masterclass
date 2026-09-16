<script setup lang="ts">
/**
 * « 🔒 Votre profil apprenant est à 60 %. Complétez-le à 100 % pour débloquer le
 * bouton « Rejoindre la session ». »
 *
 * La variante `sombre` est celle du panneau de planning de l'écran 01 : un bloc
 * violet translucide cerné de `social`. Le fond clair d'origine s'y perdait.
 */
withDefaults(defineProps<{ completion: number; bouton?: string; variante?: 'clair' | 'sombre' }>(), {
  variante: 'clair',
})
</script>

<template>
  <p
    v-if="completion < 100"
    class="text-[13px]"
    :class="variante === 'sombre'
      ? 'rounded-champ border border-social bg-social/25 p-3.5 text-[12.5px] leading-[1.55] text-social-voile-sombre'
      : 'rounded-[10px] bg-fond-voile px-4 py-3 text-texte'"
  >
    🔒 Votre profil apprenant est à <b>{{ completion }} %</b>. Complétez-le à 100 % pour débloquer le
    bouton « {{ bouton ?? 'Rejoindre la session' }} ».
    <NuxtLink
      to="/mon-espace/profil"
      class="font-bold underline"
      :class="variante === 'sombre' ? 'text-social-clair' : 'text-social'"
    >
      Compléter
    </NuxtLink>
  </p>
</template>
