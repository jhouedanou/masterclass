<script setup lang="ts">
import type { Acces, Formateur, Module, Thematique } from '#shared/types'

definePageMeta({ layout: 'espace', middleware: 'auth' })
usePagePrivee('Mes modules')

type AccesGarni = Acces & {
  module: Module | null
  formateur: Formateur | null
  thematique: Thematique | null
}

const { data: acces } = await useFetch<AccesGarni[]>('/api/mon-espace/acces')
</script>

<template>
  <div>
    <h1 class="text-[30px] font-medium">Mes modules</h1>

    <div v-if="acces?.length" class="mt-8 grid gap-6 sm:grid-cols-2">
      <article v-for="ligne in acces" :key="ligne.moduleId" class="rounded-[14px] border border-ligne-douce p-5">
        <p
          class="surtitre"
          :class="ligne.module?.programme === 'social-media' ? 'text-social' : 'text-entrepreneurs'"
        >
          {{ ligne.thematique?.nom }}
        </p>
        <h2 class="mt-2 font-title text-[20px] font-light">{{ ligne.module?.titre }}</h2>
        <p class="mt-1 text-[13px] text-discret">
          {{ ligne.formateur?.nom }} · {{ formatDuree(ligne.module?.dureeMinutes ?? 0) }}
        </p>
        <div class="mt-4 h-1.5 w-full rounded-full bg-fond-voile">
          <div class="h-full rounded-full bg-social" :style="{ width: `${ligne.progression}%` }" />
        </div>
        <p class="mt-1 text-[12.5px] text-discret">{{ ligne.progression }} % réalisé</p>
        <UiBaseButton :to="`/mon-espace/module/${ligne.module?.slug}`" class="mt-4 w-full" taille="sm">
          {{ ligne.progression === 100 ? 'Revoir le module' : 'Continuer' }}
        </UiBaseButton>
      </article>
    </div>

    <p v-else class="mt-8 rounded-[14px] border border-dashed border-ligne p-12 text-center text-[14px] text-discret">
      Vous n’avez pas encore de module.
      <NuxtLink to="/modules" class="font-bold">Voir le catalogue</NuxtLink>.
    </p>
  </div>
</template>
