<script setup lang="ts">
/**
 * Pastille d'identité : la photo de profil si l'apprenant en a déposé une,
 * ses initiales sinon. Les deux rendus partagent exactement la même emprise,
 * pour que l'en-tête ne bouge pas quand une photo arrive ou disparaît.
 */
const props = withDefaults(
  defineProps<{
    photo?: string | null
    initiales?: string
    taille?: 'pastille' | 'carte' | 'grand'
  }>(),
  { taille: 'pastille' },
)

/**
 * Les classes sont écrites en toutes lettres : Tailwind lit les sources au
 * build, une classe assemblée à l'exécution (`size-${n}`) ne serait jamais
 * générée.
 */
const TAILLES = {
  pastille: 'size-9 text-[13px]',
  carte: 'size-11 text-[14px]',
  grand: 'size-20 text-[24px]',
} as const

const emprise = computed(() => TAILLES[props.taille])
const lettres = computed(() => props.initiales?.trim() || '?')
</script>

<template>
  <img
    v-if="photo"
    :src="photo"
    alt=""
    width="96"
    height="96"
    loading="lazy"
    class="shrink-0 rounded-full border border-ligne-claire bg-fond-clair object-cover"
    :class="emprise"
  >
  <span
    v-else
    aria-hidden="true"
    class="grid shrink-0 place-items-center rounded-full bg-social font-bold text-white"
    :class="emprise"
  >
    {{ lettres }}
  </span>
</template>
