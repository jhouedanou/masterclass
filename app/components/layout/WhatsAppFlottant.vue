<script setup lang="ts">
/**
 * Bouton WhatsApp flottant, présent sur le site public et dans les trois
 * espaces (apprenant, formateur, administration).
 *
 * `ongletsJusqua` : dans les espaces qui ont une barre d'onglets fixe en bas
 * d'écran sur mobile, le bouton se pose au-dessus d'elle jusqu'au point de
 * rupture où la barre disparaît.
 */
const props = defineProps<{ ongletsJusqua?: 'md' | 'lg' }>()

const position = computed(() => {
  if (props.ongletsJusqua === 'md') return 'bottom-24 md:bottom-7'
  if (props.ongletsJusqua === 'lg') return 'bottom-24 lg:bottom-7'
  return 'bottom-7'
})
</script>

<template>
  <a
    :href="lienWhatsApp('Bonjour, je souhaite des informations sur E-Masterclass Big Five.')"
    target="_blank"
    rel="noopener"
    class="no-print fixed right-7 z-50 flex size-[58px] items-center justify-center rounded-full bg-whatsapp text-white shadow-[0_8px_24px_rgba(31,168,85,.4)] transition hover:brightness-95"
    :class="position"
    :aria-label="`Discuter sur WhatsApp au ${WHATSAPP.affichage}`"
  >
    <Icon name="ph:whatsapp-logo-fill" size="30" />
  </a>
</template>
