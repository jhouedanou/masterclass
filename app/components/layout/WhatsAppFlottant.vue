<template>
  <a
    :href="lienWhatsApp('Bonjour, je souhaite des informations sur E-Masterclass Big Five.')"
    target="_blank"
    rel="noopener"
    class="no-print fixed right-7 bottom-7 z-50 flex size-[58px] items-center justify-center rounded-full bg-whatsapp text-white shadow-[0_8px_24px_rgba(31,168,85,.4)] transition hover:brightness-95"
    :aria-label="`Discuter sur WhatsApp au ${WHATSAPP.affichage}`"
  >
    <Icon name="ph:whatsapp-logo-fill" size="30" />
  </a>
</template>
