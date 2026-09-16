<script setup lang="ts">
interface Props {
  to?: string
  href?: string
  variante?:
    | 'social'
    | 'entrepreneurs'
    | 'sombre'
    | 'blanc'
    | 'whatsapp'
    | 'contour'
    | 'contour-social'
    | 'danger'
    | 'succes'
    | 'contour-clair'
    | 'verrouille'
    | 'verrouille-sombre'
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

/**
 * Boutons en pilule, conformément aux maquettes : graisse 800, et un contour
 * tracé à 1,5 px en encre — la phase 1 le tirait à 1 px en gris de filet, ce
 * qui effaçait le bouton. `danger` sert les actions destructrices que les
 * maquettes peignent en rouge (annuler une session, supprimer un formateur) ;
 * elles étaient rendues en noir faute de variante.
 */
const classes = computed(() => {
  const base =
    'inline-flex items-center justify-center gap-2.5 rounded-full font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50'
  const tailles = {
    sm: 'px-5 py-[11px] text-[13.5px]',
    md: 'px-[26px] py-3.5 text-[15px]',
    lg: 'px-[30px] py-4 text-[16px]',
  }
  const variantes = {
    social: 'bg-social text-white hover:bg-social-fonce',
    entrepreneurs: 'bg-entrepreneurs text-white hover:bg-entrepreneurs-fonce',
    sombre: 'bg-encre text-white hover:bg-encre-800',
    blanc: 'bg-white text-encre hover:bg-fond-clair',
    whatsapp: 'bg-whatsapp text-white hover:brightness-95',
    contour: 'border-[1.5px] border-encre text-encre hover:bg-fond-clair',
    'contour-social': 'border-[1.5px] border-social text-social hover:bg-social-voile',
    danger: 'bg-erreur text-white hover:bg-erreur-fonce',
    // `succes` : le vert du bouton « Mon certificat » (planche B, écran 01).
    succes: 'bg-whatsapp text-white hover:brightness-95',
    // Les deux boutons que la maquette dessine grisés — sur carte blanche et
    // sur le panneau noir. Ce sont des états pleins, pas un `disabled:opacity-50` :
    // la maquette leur donne des couleurs propres, l'opacité effaçait le libellé.
    // Contour clair : un bouton actif posé sur le panneau noir, là où le
    // contour en encre de `contour` disparaîtrait dans le fond.
    'contour-clair': 'border-[1.5px] border-nuit-clair text-white hover:bg-white/10',
    verrouille: 'bg-ligne-claire text-discret-clair disabled:opacity-100',
    'verrouille-sombre': 'bg-nuit-inactif text-nuit-clair disabled:opacity-100',
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
