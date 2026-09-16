<script setup lang="ts">
/**
 * Coiffe de section : surtitre, titre, chapô. Les maquettes déclinent la
 * taille du titre selon l'écran — 34 px sur l'accueil, 32 px sur les pages
 * programme, 28 px sur les bandeaux d'appel, 26 px sur les FAQ de programme,
 * 23 px sur Contact — et celle du chapô entre 16 et 14,5 px. La phase 1
 * figeait 34 px et 16 px partout.
 */
const props = withDefaults(
  defineProps<{
    surtitre: string
    titre: string
    intro?: string
    ton?: 'discret' | 'social' | 'entrepreneurs' | 'clair'
    clair?: boolean
    taille?: 'xl' | 'lg' | 'md' | 'sm' | 'xs'
    /** Taille du surtitre, indépendante de celle du titre. */
    tailleSurtitre?: 'page' | 'section'
  }>(),
  { taille: 'xl' },
)

const TITRES = {
  xl: 'text-[34px]',
  lg: 'text-[32px]',
  md: 'text-[28px]',
  sm: 'text-[26px]',
  xs: 'text-[23px]',
}
const INTROS = {
  xl: 'text-[16px]',
  lg: 'text-[15.5px]',
  md: 'text-[15.5px]',
  sm: 'text-[15px]',
  xs: 'text-[15px]',
}

const classeTitre = computed(() => TITRES[props.taille])
const classeIntro = computed(() => INTROS[props.taille])
</script>

<template>
  <div>
    <UiSurtitre :ton="ton" :taille="tailleSurtitre">{{ surtitre }}</UiSurtitre>
    <h2 class="mt-2.5 font-light" :class="[classeTitre, clair && 'text-white']">{{ titre }}</h2>
    <p
      v-if="intro"
      class="mt-2.5 max-w-[760px] leading-relaxed"
      :class="[classeIntro, clair ? 'text-nuit-clair' : 'text-texte']"
    >
      {{ intro }}
    </p>
  </div>
</template>
