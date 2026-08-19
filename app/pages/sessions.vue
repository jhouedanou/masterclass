<script setup lang="ts">
import type { Formateur, SessionCoaching, Thematique } from '#shared/types'

const { data: sessions } = await useFetch<
  (SessionCoaching & { thematique: Thematique | null; formateur: Formateur | null })[]
>('/api/sessions')

usePageSeo({
  titreAuto: 'Calendrier des sessions de coaching | E-Masterclass Big Five',
  descriptionAuto:
    'Les sessions de coaching collectif sont organisées par thématique, durent 2 heures et accueillent 25 apprenants.',
  chemin: '/sessions',
})

const mailles = [{ libelle: 'Accueil', chemin: '/' }, { libelle: 'Calendrier des sessions' }]
useFilAriane(mailles)
</script>

<template>
  <div>
    <section class="rayures-social border-b border-ligne-claire">
      <div class="conteneur py-12">
        <FilAriane :mailles="mailles" class="mb-6" />
        <UiSurtitre ton="social">Coaching collectif</UiSurtitre>
        <h1 class="mt-3 text-[42px] font-medium">Calendrier des sessions</h1>
        <p class="mt-4 max-w-[760px] text-[17px] leading-relaxed text-texte">
          Les sessions sont organisées par thématique, durent 2 heures et accueillent 25 apprenants.
          L’accès à un module de la thématique ouvre l’accès à sa session, une fois la fiche
          apprenant complétée.
        </p>
      </div>
    </section>

    <section class="py-12">
      <div class="conteneur flex flex-col gap-4">
        <article
          v-for="session in sessions"
          :key="session.id"
          class="flex flex-wrap items-center justify-between gap-4 rounded-carte border border-ligne-douce p-6"
        >
          <div>
            <p
              class="surtitre"
              :class="session.programme === 'social-media' ? 'text-social' : 'text-entrepreneurs'"
            >
              {{ session.programme === 'social-media' ? 'Social Média' : 'Entrepreneurs' }}
            </p>
            <h2 class="mt-2 font-title text-[21px] font-light">{{ session.thematique?.nom }}</h2>
            <p class="mt-1 text-[14px] text-texte">
              {{ formatDate(session.date) }} à {{ session.heure }} ·
              {{ formatDuree(session.dureeMinutes) }} · {{ session.formateur?.nom }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-[14px] font-bold text-encre">
              {{ session.inscrits }} / {{ session.places }} places
            </p>
            <p
              class="mt-1 text-[13px]"
              :class="session.inscrits >= session.places ? 'text-erreur' : 'text-succes'"
            >
              {{ session.inscrits >= session.places ? 'Complet' : 'Places disponibles' }}
            </p>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
