<script setup lang="ts">
interface Props {
  to?: string
  href?: string
  variante?: 'social' | 'entrepreneurs' | 'sombre' | 'blanc' | 'whatsapp' | 'contour'
  taille?: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit'
  disabled?: boolean
  cible?: string
}

const props = withDefaults(defineProps<Props>(), {
  variante: 'social',
  taille: 'md',
  type: 'button',
})

/** Boutons en pilule pleine, conformément à la maquette. */
const classes = computed(() => {
  const base =
    'inline-flex items-center justify-center gap-2.5 rounded-full font-bold transition disabled:cursor-not-allowed disabled:opacity-50'
  const tailles = {
    sm: 'px-5 py-2.5 text-[14px]',
    md: 'px-6 py-3.5 text-[15px]',
    lg: 'px-[30px] py-4 text-[16px]',
  }
  const variantes = {
    social: 'bg-social text-white hover:bg-social-fonce',
    entrepreneurs: 'bg-entrepreneurs text-white hover:bg-entrepreneurs-fonce',
    sombre: 'bg-encre text-white hover:bg-encre-800',
    blanc: 'bg-white text-encre hover:bg-fond-clair',
    whatsapp: 'bg-whatsapp text-white hover:brightness-95',
    contour: 'border border-ligne text-encre hover:bg-fond-clair',
  }
  return [base, tailles[props.taille], variantes[props.variante]].join(' ')
})

const composant = computed(() =>
  props.to ? resolveComponent('NuxtLink') : props.href ? 'a' : 'button',
)
</script>

<template>
  <component
    :is="composant"
    :to="to"
    :href="href"
    :target="href ? (cible ?? '_blank') : undefined"
    :rel="href ? 'noopener' : undefined"
    :type="to || href ? undefined : type"
    :disabled="to || href ? undefined : disabled"
    :class="classes"
  >
    <slot />
  </component>
</template>
