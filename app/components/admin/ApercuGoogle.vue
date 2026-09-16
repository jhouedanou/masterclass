<script setup lang="ts">
/**
 * Aperçu du résultat Google (écran 24). Il vit à l'intérieur de la carte de
 * champs, entre la Meta description et le couple Open Graph.
 */
const props = defineProps<{ title: string; description: string; chemin: string }>()

const config = useRuntimeConfig()
/** Google écrit le chemin en fil d'Ariane, pas en URL brute. */
const fil = computed(() =>
  `${config.public.siteUrl}${props.chemin}`
    .replace(/^https?:\/\//, '')
    .split('/')
    .filter(Boolean)
    .join(' › '),
)
</script>

<template>
  <div class="rounded-[12px] border border-ligne-douce bg-fond-clair p-4">
    <p class="surtitre-menu text-discret">Aperçu du résultat Google</p>
    <p class="mt-2.5 font-mono text-[11.5px] text-succes">{{ fil }}</p>
    <p class="mt-1 text-[17px] text-[#1a0dab]">{{ title || 'Title non renseigné' }}</p>
    <p class="mt-1 text-[12.5px] leading-[1.5] text-texte">
      {{ description || 'Meta description non renseignée.' }}
    </p>
  </div>
</template>
