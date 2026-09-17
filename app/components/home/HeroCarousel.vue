<script setup lang="ts">
import type { ContenuBanniere, Programme, SlideBanniere } from '#shared/types'

/**
 * Bannière coulissante — un slide par entrée du bloc CMS « banniere ».
 * Contraintes de la spec SEO §6 : un seul H1 dans la page, première partie fixe,
 * seconde partie variable ; sous-titre, description, CTA, couleur et visuel
 * changent ensemble ; pilotable au clavier ; pause au survol ; glissement
 * tactile sur mobile.
 *
 * Le bloc arrive du back-office et peut être en brouillon, vide ou incomplet :
 * chaque champ est donc facultatif et retombe sur le programme correspondant,
 * qui reste la seule source du lien, de la couleur et du sous-titre.
 */
const props = defineProps<{
  programmes: Programme[]
  /** Contenu publié du bloc « banniere ». `null` tant qu'il n'est pas chargé. */
  banniere?: Partial<ContenuBanniere> | null
}>()

/** Première moitié du H1 si le CMS ne la fournit pas : la valeur historique. */
const ACCROCHE_REPLI = 'Montez en compétences.'
const DUREE_REPLI = 6000
// Sous deux secondes le slide devient illisible, au-delà de trente le carrousel
// paraît figé : une saisie fantaisiste ne doit pas casser la rotation.
const DUREE_MIN = 2000
const DUREE_MAX = 30000

type SlideAffiche = {
  cle: string
  programme: Programme
  estSocial: boolean
  surtitre: string
  accroche: string
  description: string
  cta: string
  imageFond: string
  imageVisuel: string | null
  altFond: string
  altVisuel: string
}

/** Une chaîne vide saisie au back-office vaut « non renseigné », pas « efface ». */
function texte(valeur: unknown): string | null {
  return typeof valeur === 'string' && valeur.trim() ? valeur.trim() : null
}

const programmeParSlug = computed(
  () => new Map(props.programmes.map((programme) => [programme.slug, programme])),
)

function depuisProgramme(programme: Programme): SlideAffiche {
  return {
    cle: programme.id,
    programme,
    estSocial: programme.slug === 'social-media',
    surtitre: programme.surtitreHero,
    accroche: programme.h1Variable,
    description: programme.descriptionHero,
    cta: programme.ctaHero,
    imageFond: `/images/hero/${programme.slug}.svg`,
    imageVisuel: null,
    altFond: `Visuel du programme ${programme.nom}`,
    altVisuel: `Illustration du programme ${programme.nom}`,
  }
}

function composer(slide: SlideBanniere, programme: Programme, rang: number): SlideAffiche {
  const repli = depuisProgramme(programme)
  return {
    ...repli,
    // Deux slides peuvent viser le même programme : le rang garantit une clé unique.
    cle: `${rang}-${programme.slug}`,
    accroche: texte(slide.accroche) ?? repli.accroche,
    description: texte(slide.description) ?? repli.description,
    cta: texte(slide.cta) ?? repli.cta,
    imageFond: texte(slide.imageFond) ?? repli.imageFond,
    imageVisuel: texte(slide.imageVisuel),
    altFond: texte(slide.altFond) ?? repli.altFond,
    altVisuel: texte(slide.altVisuel) ?? repli.altVisuel,
  }
}

const slides = computed<SlideAffiche[]>(() => {
  const brutes = props.banniere?.slides
  const composees = Array.isArray(brutes)
    ? brutes.flatMap((slide, rang) => {
        // Sans programme connu, ni lien ni couleur ni sous-titre : le slide est écarté.
        const programme = slide && programmeParSlug.value.get(slide.programme as Programme['slug'])
        return programme ? [composer(slide, programme, rang)] : []
      })
    : []
  // Bloc en brouillon, vide ou hors sujet : la bannière reste celle des programmes.
  return composees.length ? composees : props.programmes.map(depuisProgramme)
})

const accrocheFixe = computed(() => texte(props.banniere?.accrocheFixe) ?? ACCROCHE_REPLI)

const duree = computed(() => {
  const secondes = Number(props.banniere?.dureeSecondes)
  if (!Number.isFinite(secondes) || secondes <= 0) return DUREE_REPLI
  return Math.min(Math.max(Math.round(secondes * 1000), DUREE_MIN), DUREE_MAX)
})

const index = ref(0)
const enPause = ref(false)
let minuteur: ReturnType<typeof setInterval> | undefined

const courant = computed(() => slides.value[index.value] ?? slides.value[0]!)

function aller(i: number) {
  index.value = (i + slides.value.length) % slides.value.length
}
const suivant = () => aller(index.value + 1)
const precedent = () => aller(index.value - 1)

function armer() {
  clearInterval(minuteur)
  minuteur = setInterval(() => {
    if (!enPause.value) suivant()
  }, duree.value)
}

onMounted(armer)
// Le bloc arrive après le premier rendu : la rotation adopte alors sa durée.
watch(duree, () => {
  if (minuteur !== undefined) armer()
})
// Le nombre de slides change avec le bloc : l'index ne doit pas pointer dans le vide.
watch(
  () => slides.value.length,
  (total) => {
    if (index.value >= total) index.value = 0
  },
)
onBeforeUnmount(() => clearInterval(minuteur))

const departX = ref(0)
function debutToucher(e: TouchEvent) {
  departX.value = e.changedTouches[0]?.clientX ?? 0
}
function finToucher(e: TouchEvent) {
  const delta = (e.changedTouches[0]?.clientX ?? 0) - departX.value
  if (Math.abs(delta) > 50) (delta < 0 ? suivant : precedent)()
}
</script>

<template>
  <section
    class="relative border-b border-ligne-claire"
    tabindex="0"
    aria-roledescription="carrousel"
    aria-label="Programmes E-Masterclass Big Five"
    @mouseenter="enPause = true"
    @mouseleave="enPause = false"
    @focusin="enPause = true"
    @focusout="enPause = false"
    @touchstart.passive="debutToucher"
    @touchend.passive="finToucher"
    @keydown.left.prevent="precedent"
    @keydown.right.prevent="suivant"
  >
    <div class="grid min-h-[500px] lg:grid-cols-2">
      <div
        class="relative flex flex-col justify-center px-6 py-14 sm:px-10 lg:pt-14 lg:pr-14 lg:pb-[76px] lg:pl-16"
        :class="courant.estSocial ? 'rayures-social' : 'rayures-entrepreneurs'"
      >
        <p
          class="surtitre mb-4"
          :class="courant.estSocial ? 'text-social' : 'text-entrepreneurs'"
        >
          {{ courant.surtitre }}
        </p>

        <!--
          Un seul H1 : seule sa seconde partie change d'un slide à l'autre.
          L'accroche fixe vient du CMS, sa coupure de ligne est donc laissée au
          navigateur — la largeur de colonne reproduit les deux lignes de la planche.
        -->
        <h1 class="mb-[22px] text-[40px] leading-[1.06] font-medium sm:text-[48px] lg:text-[58px]">
          {{ accrocheFixe }}<br>
          <span :class="courant.estSocial ? 'text-social' : 'text-entrepreneurs'">
            {{ courant.accroche }}
          </span>
        </h1>

        <p class="mb-[26px] max-w-[460px] text-[17px] leading-relaxed text-texte">
          {{ courant.description }}
        </p>

        <UiBaseButton
          :to="`/programmes/${courant.programme.slug}`"
          :variante="courant.estSocial ? 'social' : 'entrepreneurs'"
          taille="lg"
          class="hidden self-start lg:inline-flex"
        >
          {{ courant.cta }}
        </UiBaseButton>
        <!-- Mobile et tablette (planche A, écrans 07 et 11) : les deux programmes côte à côte. -->
        <div class="flex flex-wrap gap-3 lg:hidden">
          <UiBaseButton
            v-for="p in programmes"
            :key="p.slug"
            :to="`/programmes/${p.slug}`"
            :variante="p.slug === 'social-media' ? 'social' : 'entrepreneurs'"
          >
            {{ p.nom }}
          </UiBaseButton>
        </div>
      </div>

      <div
        class="relative hidden items-center justify-center lg:flex"
        :class="courant.estSocial ? 'rayures-visuel-social' : 'rayures-visuel-entrepreneurs'"
      >
        <NuxtImg
          :src="courant.imageFond"
          :alt="courant.altFond"
          width="720"
          height="500"
          loading="eager"
          class="size-full object-cover"
        />
        <!-- Visuel optionnel : posé au centre du fond, jamais rogné. -->
        <NuxtImg
          v-if="courant.imageVisuel"
          :src="courant.imageVisuel"
          :alt="courant.altVisuel"
          width="520"
          height="360"
          loading="eager"
          class="absolute max-h-[76%] max-w-[76%] object-contain"
        />
      </div>
    </div>

    <button
      class="absolute top-1/2 left-4.5 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-ligne bg-white text-lg text-encre shadow-[0_4px_14px_rgba(23,21,28,.10)]"
      aria-label="Slide précédent"
      @click="precedent"
    >
      ‹
    </button>
    <button
      class="absolute top-1/2 right-4.5 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-ligne bg-white text-lg text-encre shadow-[0_4px_14px_rgba(23,21,28,.10)]"
      aria-label="Slide suivant"
      @click="suivant"
    >
      ›
    </button>

    <div class="absolute bottom-[22px] left-6 flex items-center gap-2 sm:left-10 lg:left-16">
      <button
        v-for="(slide, i) in slides"
        :key="slide.cle"
        class="h-2 rounded-full transition-all"
        :class="[
          i === index ? 'w-[26px]' : 'w-2',
          i === index
            ? slide.estSocial
              ? 'bg-social'
              : 'bg-entrepreneurs'
            : 'bg-[#cfc8dd]',
        ]"
        :aria-label="`Aller au slide ${i + 1} : ${slide.programme.nom}`"
        :aria-current="i === index"
        @click="aller(i)"
      />
      <button
        class="ml-2 text-[12px] text-discret underline"
        :aria-pressed="enPause"
        @click="enPause = !enPause"
      >
        {{ enPause ? 'Reprendre' : 'Pause' }}
      </button>
    </div>
  </section>
</template>
