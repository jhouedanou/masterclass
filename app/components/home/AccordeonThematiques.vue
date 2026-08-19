<script setup lang="ts">
import type { Formateur, Module, Thematique } from '#shared/types'

type ThematiqueGarnie = Thematique & { modules: (Module & { formateur: Formateur | null })[] }

const props = defineProps<{ thematiques: ThematiqueGarnie[]; couleur: 'social' | 'entrepreneurs' }>()
const ouvert = ref(props.thematiques[0]?.id ?? '')

watch(
  () => props.thematiques,
  (liste) => (ouvert.value = liste[0]?.id ?? ''),
)
</script>

<template>
  <div class="flex flex-col gap-3.5">
    <div
      v-for="thematique in thematiques"
      :key="thematique.id"
      class="overflow-hidden rounded-[14px] border border-ligne-tendre"
    >
      <h3>
        <button
          class="flex w-full items-center justify-between gap-4 px-7 py-5 text-left"
          :class="
            ouvert === thematique.id
              ? couleur === 'social'
                ? 'bg-social text-white'
                : 'bg-entrepreneurs text-white'
              : 'bg-white text-encre'
          "
          :aria-expanded="ouvert === thematique.id"
          @click="ouvert = ouvert === thematique.id ? '' : thematique.id"
        >
          <span class="font-title text-[21px] font-light">
            {{ thematique.numero }} · {{ thematique.nom }}
          </span>
          <span
            class="flex items-center gap-4.5 text-[14px]"
            :class="ouvert === thematique.id ? 'text-white' : 'text-discret'"
          >
            {{ thematique.modules.length }} modules
            <span aria-hidden="true" class="text-xl">{{ ouvert === thematique.id ? '−' : '+' }}</span>
          </span>
        </button>
      </h3>

      <div
        v-if="ouvert === thematique.id"
        class="grid gap-4.5 px-7 py-6 sm:grid-cols-2 lg:grid-cols-3"
        :class="couleur === 'social' ? 'bg-fond-blanc-casse' : 'bg-[#fcfcfe]'"
      >
        <CatalogueModuleCarte
          v-for="module in thematique.modules"
          :key="module.id"
          :module="module"
        />
      </div>
    </div>
  </div>
</template>
