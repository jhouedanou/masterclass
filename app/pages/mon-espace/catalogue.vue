<script setup lang="ts">
import { compterModules } from '#shared/utils/compteurs'
import type { Formateur, Module, Thematique } from '#shared/types'
import type { CarteLiveApprenant } from '~/utils/live'

/**
 * Catalogue de l'espace apprenant (maquette du 13/11, onglet « Catalogue »).
 *
 * Tous les modules de la plateforme, Live Sessions comprises, y compris ceux
 * que l'apprenant possède déjà : ils portent le badge « Vous y avez accès » et
 * s'ouvrent dans son espace plutôt que sur la fiche publique. La page remplace
 * le rail « Les modules de la plateforme » du bas du tableau de bord, qui ne
 * se filtrait pas.
 *
 * Aucune route dédiée : `/api/modules` écarte déjà les brouillons, joint
 * formateur et thématique et porte la Live Session de chaque module ;
 * `/api/mon-espace` dit ce que le compte possède.
 */
definePageMeta({ layout: 'espace', middleware: 'auth' })
usePagePrivee('Catalogue')

type ModuleCatalogue = Module & {
  formateur?: Formateur | null
  thematique?: Thematique | null
  live?: { slug: string; debut: string; dureeMinutes: number } | null
}

const { data: modules } = await useFetch<ModuleCatalogue[]>('/api/modules', { default: () => [] })
const { data: tableau } = await useFetch<{
  cartes: { moduleId: string; slug: string }[]
  liveSessions: CarteLiveApprenant[]
}>('/api/mon-espace')

/** Modules achetés : ils s'ouvrent sur leur page de l'espace. */
const slugsAchetes = computed(() => new Set((tableau.value?.cartes ?? []).map((c) => c.slug)))
/** Live Sessions où l'apprenant est inscrit : la carte de suivi est en tête
 *  du tableau de bord, c'est là que mène le lien. */
const slugsInscrits = computed(() => new Set((tableau.value?.liveSessions ?? []).map((c) => c.module.slug)))

function lienPossede(module: ModuleCatalogue): string | undefined {
  if (slugsAchetes.value.has(module.slug)) return `/mon-espace/module/${module.slug}`
  if (slugsInscrits.value.has(module.slug)) return '/mon-espace'
  return undefined
}

const programme = ref<'' | 'social-media' | 'entrepreneurs'>('')
const acces = ref<'' | 'possedes' | 'a-decouvrir'>('')

const FILTRES_PROGRAMME = [
  { valeur: '', libelle: 'Tous les programmes' },
  { valeur: 'social-media', libelle: 'Social Média' },
  { valeur: 'entrepreneurs', libelle: 'Entrepreneurs' },
] as const
const FILTRES_ACCES = [
  { valeur: '', libelle: 'Tous' },
  { valeur: 'possedes', libelle: 'Vous y avez accès' },
  { valeur: 'a-decouvrir', libelle: 'À découvrir' },
] as const

const resultats = computed(() =>
  modules.value
    .map((module) => ({ module, lien: lienPossede(module) }))
    .filter(({ module }) => !programme.value || module.programme === programme.value)
    .filter(({ lien }) => !acces.value || (acces.value === 'possedes' ? Boolean(lien) : !lien)),
)

const PILULE = 'rounded-full border px-4 py-2 text-[13.5px] font-bold'
const PILULE_ACTIVE = 'border-social bg-social text-white'
const PILULE_REPOS = 'border-ligne bg-white text-encre hover:border-social'
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-[30px] font-light">Catalogue</h1>
        <p class="mt-2 text-[15px] text-texte">
          Tous les modules de la plateforme, y compris ceux auxquels vous avez déjà accès.
        </p>
      </div>
      <p class="text-[14px] font-bold text-discret" aria-live="polite">{{ compterModules(resultats.length) }}</p>
    </div>

    <div class="mt-6 flex flex-wrap justify-between gap-3">
      <div class="flex flex-wrap gap-2" role="group" aria-label="Filtrer par programme">
        <button
          v-for="option in FILTRES_PROGRAMME"
          :key="option.valeur"
          type="button"
          :class="[PILULE, programme === option.valeur ? PILULE_ACTIVE : PILULE_REPOS]"
          :aria-pressed="programme === option.valeur"
          @click="programme = option.valeur"
        >
          {{ option.libelle }}
        </button>
      </div>
      <div class="flex flex-wrap gap-2" role="group" aria-label="Filtrer par accès">
        <button
          v-for="option in FILTRES_ACCES"
          :key="option.valeur"
          type="button"
          :class="[PILULE, acces === option.valeur ? PILULE_ACTIVE : PILULE_REPOS]"
          :aria-pressed="acces === option.valeur"
          @click="acces = option.valeur"
        >
          {{ option.libelle }}
        </button>
      </div>
    </div>

    <div v-if="resultats.length" class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <!-- Trois badges seulement (maquette) : « Vous y avez accès », « Live
           Session » et « Bientôt disponible ». Un module en vente et non
           possédé n'en porte pas. -->
      <CatalogueModuleCarte
        v-for="{ module, lien } in resultats"
        :key="module.id"
        class="bg-white"
        :module="module"
        :thematique-nom="module.thematique?.nom"
        :possede="Boolean(lien)"
        :lien-possede="lien"
        :statut-visible="module.statut !== 'disponible'"
        fleche
      />
    </div>
    <p v-else class="mt-6 rounded-carte border border-ligne-douce bg-white p-7 text-center text-[14px] text-discret">
      Aucun module ne correspond à ces filtres.
    </p>
  </div>
</template>
