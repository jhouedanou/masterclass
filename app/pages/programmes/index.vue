<script setup lang="ts">
import type { Formateur, Module, Programme, Thematique } from '#shared/types'

/** Vue d'ensemble des deux programmes, filtrable par thématique (planche A, écran 02). */
const route = useRoute()
const { data: programmes } = await useFetch<Programme[]>('/api/programmes')
const { data: thematiques } = await useFetch<Thematique[]>('/api/thematiques')
const { data: modules } = await useFetch<(Module & { formateur?: Formateur | null })[]>('/api/modules')

const filtre = ref(typeof route.query.thematique === 'string' ? route.query.thematique : '')

const modulesAffiches = computed(() =>
  (modules.value ?? [])
    .filter((m) => m.statut !== 'brouillon')
    .filter((m) => !filtre.value || m.thematiqueId === filtre.value)
    .sort((a, b) => (a.programme === b.programme ? a.numero - b.numero : a.programme === 'social-media' ? -1 : 1)),
)
const nomThematique = (id: string) => thematiques.value?.find((t) => t.id === id)?.nom

usePageSeo({
  titreAuto: 'Programmes Social Média et Entrepreneurs | E-Masterclass Big Five',
  descriptionAuto:
    'Deux programmes, six thématiques, dix-huit modules de 60 minutes à 10 000 FCFA TTC. Choisissez votre univers, puis le module qui répond à votre besoin.',
  chemin: '/programmes',
})
const mailles = [{ libelle: 'Accueil', chemin: '/' }, { libelle: 'Programmes' }]
useFilAriane(mailles)
</script>

<template>
  <div>
    <section class="rayures-social border-b border-ligne-claire">
      <div class="conteneur py-12">
        <FilAriane :mailles="mailles" class="mb-6" />
        <UiSurtitre ton="social">Nos programmes</UiSurtitre>
        <h1 class="mt-3 max-w-[900px] text-[40px] font-medium lg:text-[46px]">
          Deux programmes pour renforcer les compétences qui font la différence
        </h1>
        <p class="mt-4 max-w-[760px] text-[17px] leading-relaxed text-texte">
          Choisissez votre univers, puis le module qui répond à votre besoin du moment. Chaque module
          est indépendant, achetable à l’unité et suivi selon vos besoins.
        </p>
      </div>
    </section>

    <section class="py-14">
      <div class="conteneur">
        <div class="grid gap-7 lg:grid-cols-2">
          <article
            v-for="programme in programmes"
            :key="programme.id"
            class="rounded-carte border border-ligne-douce bg-white p-8.5"
            :style="{ borderTop: `5px solid ${programme.couleur}` }"
          >
            <h2 class="font-title text-[27px] font-light" :style="{ color: programme.couleur }">
              {{ programme.nom }}
            </h2>
            <p class="mt-2 mb-4.5 text-[15px] leading-relaxed text-texte">{{ programme.descriptionCarte }}</p>
            <p class="mb-5.5 flex flex-wrap gap-5 text-[14px] text-texte">
              <span><b class="text-encre">9 modules</b></span>
              <span><b class="text-encre">3 thématiques</b></span>
              <span><b class="text-encre">Sessions</b> de coaching collectif</span>
            </p>
            <UiBaseButton
              :to="`/programmes/${programme.slug}`"
              :variante="programme.slug === 'social-media' ? 'social' : 'entrepreneurs'"
            >
              Découvrir le programme {{ programme.nom }}
            </UiBaseButton>
          </article>
        </div>
      </div>
    </section>

    <section class="border-t border-ligne-claire bg-fond-clair py-14">
      <div class="conteneur">
        <UiEnTeteSection
          surtitre="Les thématiques"
          titre="Explorez les modules thématique par thématique"
          intro="Sélectionnez une thématique pour n’afficher que ses modules. Chaque module peut être choisi et acheté indépendamment."
        />

        <div class="mt-7 flex flex-wrap gap-2" role="group" aria-label="Filtrer par thématique">
          <button
            class="rounded-full border px-4.5 py-2.5 text-[14px] font-bold"
            :class="!filtre ? 'border-encre bg-encre text-white' : 'border-ligne bg-white text-texte hover:border-discret'"
            :aria-pressed="!filtre"
            @click="filtre = ''"
          >
            Toutes
          </button>
          <button
            v-for="t in thematiques"
            :key="t.id"
            class="rounded-full border px-4.5 py-2.5 text-[14px] font-bold"
            :class="
              filtre === t.id
                ? t.programme === 'social-media'
                  ? 'border-social bg-social text-white'
                  : 'border-entrepreneurs bg-entrepreneurs text-white'
                : 'border-ligne bg-white text-texte hover:border-discret'
            "
            :aria-pressed="filtre === t.id"
            @click="filtre = t.id"
          >
            {{ t.nom }}
          </button>
        </div>

        <div class="mt-7 grid gap-5.5 sm:grid-cols-2 lg:grid-cols-3">
          <CatalogueModuleCarte
            v-for="m in modulesAffiches"
            :key="m.id"
            :module="m"
            :thematique-nom="nomThematique(m.thematiqueId)"
            statut-visible
            class="bg-white"
          />
        </div>
      </div>
    </section>
  </div>
</template>
