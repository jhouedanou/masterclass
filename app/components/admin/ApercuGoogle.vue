<script setup lang="ts">
const props = defineProps<{ title: string; description: string; chemin: string }>()

const config = useRuntimeConfig()
const url = computed(() => `${config.public.siteUrl}${props.chemin}`.replace(/^https?:\/\//, ''))

// Aperçu indicatif : aucune limite dure de caractères n'est imposée (spec SEO §3).
</script>

<template>
  <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
    <p class="surtitre text-discret">Aperçu du résultat Google</p>
    <div class="mt-3">
      <p class="text-[12.5px] text-texte">{{ url }}</p>
      <p class="mt-1 text-[18px] text-[#1a0dab]">{{ title || 'Title non renseigné' }}</p>
      <p class="mt-1 text-[13.5px] text-texte">
        {{ description || 'Meta description non renseignée.' }}
      </p>
    </div>
    <p class="mt-3 text-[12px] text-discret">
      Title : {{ title.length }} caractères · Meta description : {{ description.length }} caractères.
      <span v-if="title.length > 60 || description.length > 160" class="text-alerte">
        Au-delà des longueurs habituelles, Google peut réécrire l’extrait.
      </span>
    </p>
  </div>
</template>
