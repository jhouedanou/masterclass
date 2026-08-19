<script setup lang="ts">
import type { Formateur, Module } from '#shared/types'

const props = defineProps<{
  module: Module & { formateur?: Formateur | null }
  thematiqueNom?: string
  statutVisible?: boolean
}>()

const social = computed(() => props.module.programme === 'social-media')
const teinte = computed(() => (social.value ? 'text-social' : 'text-entrepreneurs'))
</script>

<template>
  <article
    class="flex flex-col gap-2.5 rounded-[12px] border p-[22px]"
    :class="social ? 'border-ligne-douce' : 'border-entrepreneurs-bordure'"
  >
    <div class="flex items-start justify-between gap-3">
      <p class="text-[12px] font-bold tracking-[0.1em] uppercase" :class="teinte">
        Module {{ numeroModule(module.numero) }}<template v-if="thematiqueNom"> · {{ thematiqueNom }}</template>
      </p>
      <span
        v-if="statutVisible"
        class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
        :class="
          module.statut === 'disponible'
            ? 'bg-succes-voile text-succes'
            : 'bg-alerte-voile text-alerte'
        "
      >
        {{ module.statut === 'disponible' ? 'Disponible' : 'À venir' }}
      </span>
    </div>

    <h3 class="font-title text-[18px] leading-[1.3] font-light">
      <NuxtLink :to="`/modules/${module.slug}`" class="text-encre hover:underline">
        {{ module.titre }}
      </NuxtLink>
    </h3>

    <p class="text-[13px] text-discret">
      {{ module.formateur?.nom }} · {{ formatDuree(module.dureeMinutes) }} ·
      {{ formatFcfa(module.prixFcfa, true) }}
    </p>

    <NuxtLink :to="`/modules/${module.slug}`" class="mt-auto pt-1 text-[14px] font-bold" :class="teinte">
      Découvrir le module →
    </NuxtLink>
  </article>
</template>
