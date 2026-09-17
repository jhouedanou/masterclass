<script setup lang="ts">
/**
 * Aperçu du résultat Google (écran 24). Il vit à l'intérieur de la carte de
 * champs, entre la Meta description et le couple Open Graph.
 */
const props = defineProps<{ title: string; description: string; chemin: string }>()

const config = useRuntimeConfig()
/** Google écrit le chemin en fil d'Ariane, pas en URL brute. */
const url = computed(() =>
  `${config.public.siteUrl}${props.chemin}`
    .replace(/^https?:\/\//, '')
    .split('/')
    .filter(Boolean)
    .join(' › '),
)

// Aperçu indicatif : aucune limite dure de caractères n'est imposée (spec SEO
// §3), et l'écran 24 n'affiche aucun compteur — il montre le résultat, pas la
// règle.
</script>

<template>
  <!-- Encart de l'écran 24, à l'intérieur de la carte : ce n'est pas une carte
       à part, d'où le fond clair et le filet tendre. -->
  <div class="rounded-[12px] border border-ligne-douce bg-fond-clair p-4">
    <p class="mb-2.5 text-[11px] font-bold tracking-[0.1em] text-discret uppercase">
      Aperçu du résultat Google
    </p>
    <p class="font-mono text-[11.5px] text-succes">{{ url }}</p>
    <p class="mt-1 mb-[3px] text-[17px] text-[#1a0dab]">{{ title || 'Title non renseigné' }}</p>
    <p class="text-[12.5px] leading-[1.5] text-texte">
      {{ description || 'Meta description non renseignée.' }}
    </p>
  </div>
</template>
