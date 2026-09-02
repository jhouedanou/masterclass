<script setup lang="ts">
import type { Programme } from '#shared/types'

/**
 * Bannière coulissante — un slide par programme.
 * Contraintes de la spec SEO §6 : un seul H1 dans la page, première partie fixe
 * « Montez en compétences. », seconde partie variable ; sous-titre, description,
 * CTA, couleur et visuel changent ensemble ; pilotable au clavier ; pause au
 * survol ; glissement tactile sur mobile.
 */
const props = defineProps<{ programmes: Programme[] }>()

const index = ref(0)
const enPause = ref(false)
let minuteur: ReturnType<typeof setInterval> | undefined

const courant = computed(() => props.programmes[index.value]!)
const estSocial = computed(() => courant.value.slug === 'social-media')

function aller(i: number) {
  index.value = (i + props.programmes.length) % props.programmes.length
}
const suivant = () => aller(index.value + 1)
const precedent = () => aller(index.value - 1)

onMounted(() => {
  minuteur = setInterval(() => {
    if (!enPause.value) suivant()
  }, 6000)
})
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
        :class="estSocial ? 'rayures-social' : 'rayures-entrepreneurs'"
      >
        <p
          class="surtitre mb-4"
          :class="estSocial ? 'text-social' : 'text-entrepreneurs'"
        >
          {{ courant.surtitreHero }}
        </p>

        <!-- Un seul H1 : seule sa seconde partie change d'un slide à l'autre. -->
        <h1 class="mb-[22px] text-[40px] leading-[1.06] font-medium sm:text-[48px] lg:text-[58px]">
          Montez en<br>compétences.<br>
          <span :class="estSocial ? 'text-social' : 'text-entrepreneurs'">
            {{ courant.h1Variable }}
          </span>
        </h1>

        <p class="mb-[26px] max-w-[460px] text-[17px] leading-relaxed text-texte">
          {{ courant.descriptionHero }}
        </p>

        <UiBaseButton
          :to="`/programmes/${courant.slug}`"
          :variante="estSocial ? 'social' : 'entrepreneurs'"
          taille="lg"
          class="self-start"
        >
          {{ courant.ctaHero }}
        </UiBaseButton>
      </div>

      <div
        class="relative hidden items-center justify-center lg:flex"
        :class="estSocial ? 'rayures-visuel-social' : 'rayures-visuel-entrepreneurs'"
      >
        <NuxtImg
          :src="`/images/hero/${courant.slug}.svg`"
          :alt="`Visuel du programme ${courant.nom}`"
          width="720"
          height="500"
          loading="eager"
          class="size-full object-cover"
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
        v-for="(programme, i) in programmes"
        :key="programme.id"
        class="h-2 rounded-full transition-all"
        :class="[
          i === index ? 'w-[26px]' : 'w-2',
          i === index
            ? programme.slug === 'social-media'
              ? 'bg-social'
              : 'bg-entrepreneurs'
            : 'bg-[#cfc8dd]',
        ]"
        :aria-label="`Aller au slide ${i + 1} : ${programme.nom}`"
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
