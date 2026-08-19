<script setup lang="ts">
import type { Formateur, Module, Thematique } from '#shared/types'

const programme = ref('')

const { data: modules } = await useFetch<
  (Module & { formateur: Formateur | null; thematique: Thematique | null })[]
>('/api/modules', {
  query: computed(() => ({ programme: programme.value || undefined })),
})

usePageSeo({
  titreAuto: 'Tous les modules | E-Masterclass Big Five',
  descriptionAuto:
    'Le catalogue complet des 18 modules E-Masterclass Big Five, à 10 000 FCFA TTC l’unité, avec accès à vie et coaching collectif.',
  // Le filtre par programme ne change pas l'URL : /modules reste la seule page
  // indexable. Si des URL filtrées sont un jour exposées, les passer en noindex.
  chemin: '/modules',
})

const mailles = [{ libelle: 'Accueil', chemin: '/' }, { libelle: 'Modules' }]
useFilAriane(mailles)
</script>

<template>
  <div>
    <section class="rayures-social border-b border-ligne-claire">
      <div class="conteneur py-12">
        <FilAriane :mailles="mailles" class="mb-6" />
        <UiSurtitre ton="social">Le catalogue</UiSurtitre>
        <h1 class="mt-3 text-[42px] font-medium">Tous les modules</h1>
        <p class="mt-4 max-w-[720px] text-[17px] leading-relaxed text-texte">
          Chaque module dure 60 minutes, coûte 10 000 FCFA TTC et reste accessible à vie.
        </p>
      </div>
    </section>

    <section class="py-12">
      <div class="conteneur">
        <div class="flex flex-wrap gap-2" role="group" aria-label="Filtrer par programme">
          <button
            v-for="option in [
              { valeur: '', libelle: 'Tous', actif: 'border-encre bg-encre text-white' },
              { valeur: 'social-media', libelle: 'Social Média', actif: 'border-social bg-social text-white' },
              { valeur: 'entrepreneurs', libelle: 'Entrepreneurs', actif: 'border-entrepreneurs bg-entrepreneurs text-white' },
            ]"
            :key="option.valeur"
            class="rounded-full border px-4.5 py-2.5 text-[14px] font-bold"
            :class="programme === option.valeur ? option.actif : 'border-ligne text-texte'"
            :aria-pressed="programme === option.valeur"
            @click="programme = option.valeur"
          >
            {{ option.libelle }}
          </button>
        </div>

        <p class="mt-6 text-[13px] text-discret">{{ modules?.length ?? 0 }} module(s)</p>

        <div class="mt-4 grid gap-5.5 sm:grid-cols-2 lg:grid-cols-3">
          <CatalogueModuleCarte
            v-for="module in modules"
            :key="module.id"
            :module="module"
            :thematique-nom="module.thematique?.nom"
            statut-visible
          />
        </div>
      </div>
    </section>
  </div>
</template>
