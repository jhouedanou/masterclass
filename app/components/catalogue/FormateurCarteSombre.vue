<script setup lang="ts">
import type { Formateur } from '#shared/types'

defineProps<{ formateur: Formateur & { nbModules?: number } }>()
</script>

<template>
  <article class="flex flex-col gap-3 rounded-[14px] bg-encre-800 p-6">
    <NuxtImg
      :src="formateur.photo"
      :alt="`Portrait de ${formateur.nom}`"
      width="84"
      height="84"
      loading="lazy"
      class="size-21 rounded-full object-cover"
    />
    <div>
      <h3 class="font-title text-[19px] font-light text-white">{{ formateur.nom }}</h3>
      <p class="mt-1 text-[13px] text-[#b9b4c4]">{{ formateur.expertise }}</p>
      <p class="mt-1.5 text-[12.5px] text-[#8f8a9c]">
        {{ formateur.programmePrincipal === 'social-media' ? 'Social Média' : 'Entrepreneurs' }} ·
        {{ formateur.nbModules }} modules
      </p>
    </div>
    <NuxtLink
      :to="`/formateurs/${formateur.slug}`"
      class="mt-auto pt-1 text-[13px] font-bold text-social-clair hover:text-white"
    >
      Voir le profil →
    </NuxtLink>
  </article>
</template>
