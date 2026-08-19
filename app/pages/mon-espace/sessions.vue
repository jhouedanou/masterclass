<script setup lang="ts">
import type { Formateur, SessionCoaching, Thematique } from '#shared/types'

definePageMeta({ layout: 'espace', middleware: 'auth' })
usePagePrivee('Mes sessions de coaching')

const auth = useAuthStore()
const { data: sessions } = await useFetch<
  (SessionCoaching & { thematique: Thematique | null; formateur: Formateur | null })[]
>('/api/sessions')
</script>

<template>
  <div>
    <h1 class="text-[30px] font-medium">Mes sessions de coaching</h1>
    <p class="mt-2 max-w-[680px] text-[15px] text-texte">
      Les sessions sont organisées par thématique. Vous devez avoir accès à un module concerné et
      avoir complété votre fiche apprenant pour rejoindre une séance.
    </p>

    <p
      v-if="auth.utilisateur && !auth.utilisateur.ficheCompletee"
      class="mt-5 rounded-[12px] border border-alerte bg-alerte-voile p-4 text-[14px] text-alerte"
    >
      Votre fiche apprenant n’est pas complète.
      <NuxtLink to="/mon-espace/profil" class="font-bold underline">La compléter</NuxtLink>.
    </p>

    <div class="mt-8 flex flex-col gap-3">
      <article
        v-for="session in sessions"
        :key="session.id"
        class="flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-ligne-douce p-5"
      >
        <div>
          <p
            class="surtitre"
            :class="session.programme === 'social-media' ? 'text-social' : 'text-entrepreneurs'"
          >
            {{ session.programme === 'social-media' ? 'Social Média' : 'Entrepreneurs' }}
          </p>
          <h2 class="mt-2 font-title text-[19px] font-light">{{ session.thematique?.nom }}</h2>
          <p class="mt-1 text-[13px] text-discret">
            {{ formatDate(session.date) }} à {{ session.heure }} ·
            {{ formatDuree(session.dureeMinutes) }} · {{ session.formateur?.nom }}
          </p>
        </div>
        <UiBaseButton
          taille="sm"
          :variante="session.inscrits >= session.places ? 'contour' : 'social'"
          :disabled="session.inscrits >= session.places"
        >
          {{ session.inscrits >= session.places ? 'Complet' : 'Rejoindre la session' }}
        </UiBaseButton>
      </article>
    </div>
  </div>
</template>
