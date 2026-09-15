<script setup lang="ts">
import type { Formateur, Module, Thematique } from '#shared/types'

/**
 * Le catalogue de la plateforme, dans l'espace privé (planche B, écran 01).
 *
 * L'apprenant ne voyait que les modules qu'il possède : le reste de l'offre ne
 * lui était visible que depuis le site public, qu'il n'a plus de raison de
 * rouvrir une fois connecté. Tout le catalogue défile donc ici, les modules
 * déjà accessibles portant un marqueur plutôt que d'être retirés — la liste
 * garde ainsi l'ordre canonique du site, et l'apprenant s'y repère.
 *
 * Un rail à défilement natif, pas un carousel à diapositives : ce sont des
 * cartes à parcourir, pas des écrans à présenter. Le doigt et la molette
 * suffisent, `scroll-snap` aligne les cartes, et les flèches ne sont là que
 * pour la souris. Rien à charger — le projet n'embarque aucune bibliothèque de
 * carousel, et `HomeHeroCarousel` répond à un tout autre besoin.
 */
const props = defineProps<{
  modules: (Module & { formateur?: Formateur | null; thematique?: Thematique | null })[]
  moduleIdsPossedes: string[]
}>()

const possedes = computed(() => new Set(props.moduleIdsPossedes))

const rail = ref<HTMLElement | null>(null)
const auDebut = ref(true)
const aLaFin = ref(false)

/** Marge de tolérance, en pixels, pour situer les extrémités du rail. */
const MARGE = 24

/**
 * Estompe les flèches aux extrémités. La marge absorbe deux approximations :
 * les largeurs fractionnaires du navigateur, et le recalage que `scroll-snap`
 * applique après coup — il déplace le rail de quelques pixels une fois la
 * mesure prise.
 *
 * C'est une indication, pas un verrou : les boutons restent cliquables. Une
 * mesure en retard d'un événement désactiverait sinon une flèche encore utile,
 * et le rail deviendrait impossible à parcourir à la souris.
 */
function mesurer() {
  const el = rail.value
  if (!el) return
  auDebut.value = el.scrollLeft <= MARGE
  aLaFin.value = el.scrollLeft + el.clientWidth >= el.scrollWidth - MARGE
}

/** Défile d'un écran de rail moins une carte, pour garder un repère visuel. */
function defiler(sens: 1 | -1) {
  const el = rail.value
  if (!el) return
  el.scrollBy({ left: sens * Math.max(el.clientWidth - 120, 200), behavior: 'smooth' })
}

/**
 * L'écouteur est posé à la main plutôt que par `@scroll` : le défilement d'un
 * conteneur ne remonte pas, et la liaison de gabarit s'est révélée ne pas
 * recevoir l'événement ici. Un état figé serait pire qu'inutile — une flèche
 * restée désactivée à tort bloquerait le rail.
 */
onMounted(() => {
  mesurer()
  rail.value?.addEventListener('scroll', mesurer, { passive: true })
  // `scrollend` clôt le défilement doux des flèches ; absent de quelques
  // navigateurs, auquel cas `scroll` suffit déjà.
  rail.value?.addEventListener('scrollend', mesurer, { passive: true })
  window.addEventListener('resize', mesurer)
})

onBeforeUnmount(() => {
  rail.value?.removeEventListener('scroll', mesurer)
  rail.value?.removeEventListener('scrollend', mesurer)
  window.removeEventListener('resize', mesurer)
})
</script>

<template>
  <section v-if="modules.length" class="mt-10">
    <div class="flex items-end justify-between gap-4">
      <div>
        <h2 class="font-title text-[22px] leading-tight font-light">Les modules de la plateforme</h2>
        <p class="mt-1 text-[13.5px] text-discret">
          Tout le catalogue, y compris les modules auxquels vous avez déjà accès.
        </p>
      </div>
      <!-- Souris seulement : au doigt, le rail défile nativement. -->
      <div class="hidden shrink-0 gap-2 lg:flex">
        <button
          type="button"
          class="grid size-9 place-items-center rounded-full border border-ligne text-encre transition"
          :class="auDebut && 'opacity-30'"
          aria-label="Modules précédents"
          @click="defiler(-1)"
        >
          ←
        </button>
        <button
          type="button"
          class="grid size-9 place-items-center rounded-full border border-ligne text-encre transition"
          :class="aLaFin && 'opacity-30'"
          aria-label="Modules suivants"
          @click="defiler(1)"
        >
          →
        </button>
      </div>
    </div>

    <!-- `tabindex` : un conteneur défilant doit être atteignable au clavier,
         sans quoi son contenu débordant reste hors de portée. -->
    <ul
      ref="rail"
      class="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
      tabindex="0"
    >
      <li
        v-for="module in modules"
        :key="module.id"
        class="w-[280px] shrink-0 snap-start sm:w-[320px]"
      >
        <CatalogueModuleCarte
          class="h-full bg-white"
          :module="module"
          :thematique-nom="module.thematique?.nom"
          :possede="possedes.has(module.id)"
        />
      </li>
    </ul>
  </section>
</template>
