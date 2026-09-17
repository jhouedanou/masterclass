<script setup lang="ts">
import type { Acces, Formateur, Module, Thematique } from '#shared/types'
import { compterPlaces } from '#shared/utils/compteurs'

definePageMeta({ layout: 'espace', middleware: 'auth' })
usePagePrivee('Mes modules')

type AccesGarni = Acces & {
  module: Module | null
  formateur: Formateur | null
  thematique: Thematique | null
}

interface Carte {
  moduleId: string
  slug: string
  chapitresVus: number
  chapitresTotal: number
  progression: number
  certificat: string | null
  prochaineSession: { id: string; date: string; heure: string; inscrit: boolean; places: number; inscrits: number } | null
}

const { data: acces } = await useFetch<AccesGarni[]>('/api/mon-espace/acces')
const { data: tableau } = await useFetch<{ cartes: Carte[] }>('/api/mon-espace')
const { data: suggestions } = await useFetch<Module[]>('/api/modules')

const cartes = computed(() => new Map((tableau.value?.cartes ?? []).map((c) => [c.moduleId, c])))

/** 5 · Suggestion (non acheté) : le module suivant de la thématique du module en cours. */
const suggestion = computed(() => {
  const possedes = new Set((acces.value ?? []).map((a) => a.moduleId))
  const enCours = (acces.value ?? []).find((a) => a.progression < 100)?.module
  if (!enCours) return null
  return (
    (suggestions.value ?? []).find(
      (m) => m.thematiqueId === enCours.thematiqueId && m.numero > enCours.numero && !possedes.has(m.id) && m.statut === 'disponible',
    ) ?? null
  )
})

/** 4 · Session imminente : demain ou aujourd'hui. */
function imminente(carte?: Carte) {
  if (!carte?.prochaineSession) return false
  const jours = Math.round((new Date(`${carte.prochaineSession.date}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000)
  return jours >= 0 && jours <= 1
}
</script>

<template>
  <div>
    <h1 class="text-[30px] font-light">Mes modules</h1>

    <div v-if="acces?.length" class="mt-8 grid gap-6 sm:grid-cols-2">
      <article v-for="ligne in acces" :key="ligne.moduleId" class="flex flex-col rounded-[14px] border border-ligne-douce bg-white p-5">
        <p class="surtitre" :class="ligne.module?.programme === 'social-media' ? 'text-social' : 'text-entrepreneurs'">
          {{ ligne.module?.programme === 'social-media' ? 'Social Média' : 'Entrepreneurs' }} · {{ ligne.thematique?.nom }}
        </p>
        <h2 class="mt-2 font-title text-[20px] font-light">{{ ligne.module?.titre }}</h2>
        <p class="mt-1 text-[13px] text-discret">
          {{ ligne.formateur?.nom }} · {{ formatDuree(ligne.module?.dureeMinutes ?? 0) }}
        </p>

        <!-- 4 · Session imminente -->
        <p v-if="imminente(cartes.get(ligne.moduleId))" class="mt-3 rounded-[10px] bg-alerte-voile px-3 py-2 text-[13px] text-alerte">
          🗓 Session de coaching {{ cartes.get(ligne.moduleId)?.prochaineSession?.date === new Date().toISOString().slice(0, 10) ? 'aujourd’hui' : 'demain' }}
          {{ cartes.get(ligne.moduleId)?.prochaineSession?.heure.replace(':', 'h') }}
          — {{ compterPlaces(Math.max(0, (cartes.get(ligne.moduleId)?.prochaineSession?.places ?? 0) - (cartes.get(ligne.moduleId)?.prochaineSession?.inscrits ?? 0))) }} restantes
        </p>

        <div class="mt-auto flex items-center justify-between gap-3 pt-4">
          <span class="text-[13.5px] font-bold text-encre">
            {{ cartes.get(ligne.moduleId)?.chapitresVus ?? 0 }}/{{ cartes.get(ligne.moduleId)?.chapitresTotal ?? ligne.module?.chapitres.length ?? 0 }}<span v-if="ligne.progression === 100"> ✓</span>
          </span>
          <UiBaseButton
            v-if="imminente(cartes.get(ligne.moduleId)) && ligne.progression < 100"
            to="/mon-espace/sessions"
            taille="sm"
            variante="contour"
          >
            Voir la session
          </UiBaseButton>
          <UiBaseButton
            v-else-if="ligne.progression === 100"
            :to="cartes.get(ligne.moduleId)?.certificat ? `/certificats/${cartes.get(ligne.moduleId)?.certificat}` : '/mon-espace/certificats'"
            taille="sm"
            variante="sombre"
          >
            Mon certificat
          </UiBaseButton>
          <UiBaseButton v-else :to="`/mon-espace/module/${ligne.module?.slug}`" taille="sm">
            {{ ligne.progression > 0 ? 'Continuer' : 'Commencer' }}
          </UiBaseButton>
        </div>
      </article>

      <!-- 5 · Suggestion (non acheté) -->
      <article v-if="suggestion" class="flex flex-col rounded-[14px] border border-dashed border-ligne bg-fond-clair p-5">
        <p class="surtitre" :class="suggestion.programme === 'social-media' ? 'text-social' : 'text-entrepreneurs'">
          {{ suggestion.programme === 'social-media' ? 'Social Média' : 'Entrepreneurs' }}
        </p>
        <h2 class="mt-2 font-title text-[20px] font-light">{{ suggestion.titre }}</h2>
        <p class="mt-1 text-[13px] text-discret">Suite logique de votre module en cours.</p>
        <div class="mt-auto pt-4">
          <UiBaseButton :to="`/modules/${suggestion.slug}`" taille="sm" variante="contour">
            Découvrir — {{ formatFcfa(suggestion.prixFcfa) }}
          </UiBaseButton>
        </div>
      </article>
    </div>

    <p v-else class="mt-8 rounded-[14px] border border-dashed border-ligne p-12 text-center text-[14px] text-discret">
      Vous n’avez pas encore de module.
      <NuxtLink to="/modules" class="font-bold">Voir le catalogue</NuxtLink>.
    </p>
  </div>
</template>
