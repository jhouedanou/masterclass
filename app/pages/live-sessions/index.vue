<script setup lang="ts">
import type { Formateur, LiveSession } from '#shared/types'

type Carte = LiveSession & { formateur: Formateur | null; passee: boolean }
const { data } = await useFetch<{ aVenir: Carte[]; passees: Carte[] }>('/api/live-sessions')

usePageSeo({
  titreAuto: 'Live Sessions | E-Masterclass Big Five',
  descriptionAuto:
    'Séances en direct avec les formateurs E-Masterclass Big Five : prérequis, programme, date et prix de chaque Live Session.',
  chemin: '/live-sessions',
})

const mailles = [{ libelle: 'Accueil', chemin: '/' }, { libelle: 'Live Sessions' }]
useFilAriane(mailles)
</script>

<template>
  <div>
    <section class="rayures-social border-b border-ligne-claire">
      <div class="conteneur py-12">
        <FilAriane :mailles="mailles" class="mb-6" />
        <UiSurtitre ton="social" taille="section">En direct</UiSurtitre>
        <h1 class="mt-3 text-[42px] font-medium">Live Sessions</h1>
        <p class="mt-4 max-w-prose text-[17px] leading-relaxed text-texte">
          Des séances en direct avec nos formateurs, sur Zoom depuis la plateforme. Chaque fiche
          présente les prérequis, ce que vous apprendrez, la date et le prix.
        </p>
      </div>
    </section>

    <section class="py-12">
      <div class="conteneur">
        <h2 class="font-title text-[26px] font-light">Prochaines sessions</h2>
        <p v-if="!data?.aVenir.length" class="mt-4 max-w-prose text-[15px] text-texte">
          Aucune Live Session n’est programmée pour le moment. Revenez bientôt, ou suivez nos
          formateurs depuis leur fiche.
        </p>
        <div v-else class="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <LiveCarteLiveSession v-for="live in data.aVenir" :key="live.id" :live="live" />
        </div>

        <template v-if="data?.passees.length">
          <h2 class="mt-14 font-title text-[22px] font-light text-discret">Sessions passées</h2>
          <div class="mt-5 grid gap-5 opacity-80 sm:grid-cols-2 lg:grid-cols-3">
            <LiveCarteLiveSession v-for="live in data.passees" :key="live.id" :live="live" />
          </div>
        </template>
      </div>
    </section>
  </div>
</template>
