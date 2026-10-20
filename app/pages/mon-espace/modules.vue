<script setup lang="ts">
import type { Acces, EtatQuiz, Formateur, Module, Thematique } from '#shared/types'
import { quizAReussir } from '#shared/utils/attestation'
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
  quiz: EtatQuiz | null
  prochaineSession: { id: string; date: string; heure: string; inscrit: boolean; places: number; inscrits: number } | null
}

const { data: acces } = await useFetch<AccesGarni[]>('/api/mon-espace/acces')
const { data: tableau } = await useFetch<{ cartes: Carte[] }>('/api/mon-espace')
const { data: suggestions } = await useFetch<Module[]>('/api/modules')

const cartes = computed(() => new Map((tableau.value?.cartes ?? []).map((c) => [c.moduleId, c])))

/**
 * Deux onglets : les modules en vente d'abord ; ceux que le compte possède
 * déjà sans qu'ils soient en vente (brouillon, en préparation — le cas d'un
 * compte d'équipe) sont rangés à part, pour ne pas se mêler au catalogue réel.
 */
const onglet = ref<'disponibles' | 'a-venir'>('disponibles')
const estAVenir = (ligne: AccesGarni) => ligne.module?.statut !== 'disponible'
const nbAVenir = computed(() => (acces.value ?? []).filter(estAVenir).length)
const lignes = computed(() =>
  (acces.value ?? []).filter((ligne) => estAVenir(ligne) === (onglet.value === 'a-venir')),
)
const options = computed(() => [
  { valeur: 'disponibles' as const, libelle: `Disponibles (${(acces.value?.length ?? 0) - nbAVenir.value})` },
  { valeur: 'a-venir' as const, libelle: `À venir (${nbAVenir.value})` },
])

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

/** Vidéos finies mais quiz à réussir : l'attestation attend encore. */
function quizEnAttente(ligne: AccesGarni): boolean {
  const carte = cartes.value.get(ligne.moduleId)
  return ligne.progression === 100 && !carte?.certificat && quizAReussir(carte?.quiz)
}

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

    <div
      v-if="nbAVenir"
      class="mt-6 inline-flex gap-1 rounded-full bg-fond-voile p-1.5 text-[14px] font-bold"
      role="group"
      aria-label="Afficher les modules"
    >
      <button
        v-for="option in options"
        :key="option.valeur"
        type="button"
        class="rounded-full px-5 py-2"
        :class="onglet === option.valeur ? 'bg-encre text-white' : 'text-texte hover:text-encre'"
        :aria-pressed="onglet === option.valeur"
        @click="onglet = option.valeur"
      >
        {{ option.libelle }}
      </button>
    </div>
    <p v-if="onglet === 'a-venir'" class="mt-3 max-w-[680px] text-[13.5px] text-discret">
      Modules auxquels vous avez déjà accès mais qui ne sont pas encore en vente.
    </p>

    <div v-if="lignes.length" class="mt-6 grid gap-6 sm:grid-cols-2">
      <article v-for="ligne in lignes" :key="ligne.moduleId" class="flex flex-col rounded-[14px] border border-ligne-douce bg-white p-5">
        <p class="surtitre" :class="ligne.module?.programme === 'social-media' ? 'text-social' : 'text-entrepreneurs'">
          {{ ligne.module?.programme === 'social-media' ? 'Social Média' : 'Entrepreneurs' }} · {{ ligne.thematique?.nom }}
        </p>
        <h2 class="mt-2 font-title text-[20px] font-light">
          {{ ligne.module?.titre }}
          <span
            v-if="estAVenir(ligne)"
            class="ml-2 inline-block rounded-full bg-fond-voile px-2.5 py-0.5 align-middle font-sans text-[11.5px] font-bold text-texte"
          >
            {{ ligne.module?.statut === 'en-preparation' ? 'En préparation' : 'Brouillon' }}
          </span>
        </h2>
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
            <span v-if="quizEnAttente(ligne)" class="ml-1.5 rounded-full bg-alerte-voile px-2 py-0.5 text-[11.5px] text-alerte-fonce">Quiz à réussir</span>
          </span>
          <UiBaseButton
            v-if="imminente(cartes.get(ligne.moduleId)) && ligne.progression < 100"
            to="/mon-espace/sessions"
            taille="sm"
            variante="contour"
          >
            Voir la session
          </UiBaseButton>
          <!-- Module terminé : on peut le revoir autant qu'on veut (recette, APP-03). -->
          <span v-else-if="ligne.progression === 100" class="flex flex-wrap justify-end gap-2">
            <UiBaseButton :to="`/mon-espace/module/${ligne.module?.slug}`" taille="sm" variante="contour">
              Revoir
            </UiBaseButton>
            <UiBaseButton v-if="quizEnAttente(ligne)" :to="`/mon-espace/quiz/${ligne.module?.slug}`" taille="sm">
              Passer le quiz
            </UiBaseButton>
            <UiBaseButton
              v-else
              :to="cartes.get(ligne.moduleId)?.certificat ? `/certificats/${cartes.get(ligne.moduleId)?.certificat}` : '/mon-espace/certificats'"
              taille="sm"
              variante="sombre"
            >
              Mon certificat
            </UiBaseButton>
          </span>
          <UiBaseButton v-else :to="`/mon-espace/module/${ligne.module?.slug}`" taille="sm">
            {{ ligne.progression > 0 ? 'Continuer' : 'Commencer' }}
          </UiBaseButton>
        </div>
      </article>

      <!-- 5 · Suggestion (non acheté) -->
      <article v-if="suggestion && onglet === 'disponibles'" class="flex flex-col rounded-[14px] border border-dashed border-ligne bg-fond-clair p-5">
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

    <p v-else class="mt-6 rounded-[14px] border border-dashed border-ligne p-12 text-center text-[14px] text-discret">
      {{ acces?.length ? 'Aucun de vos modules n’est encore en vente.' : 'Vous n’avez pas encore de module.' }}
      <NuxtLink to="/modules" class="font-bold">Voir le catalogue</NuxtLink>.
    </p>
  </div>
</template>
