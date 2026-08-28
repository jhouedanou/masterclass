<template>
  <div class="flex min-h-screen flex-col bg-white">
    <a
      href="#contenu"
      class="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded focus:bg-encre focus:px-4 focus:py-2 focus:text-white"
    >
      Aller au contenu
    </a>
    <LayoutTheHeader />
    <main id="contenu" class="flex-1">
      <slot />
    </main>
    <LayoutTheFooter />
    <LayoutWhatsAppFlottant />
    <LayoutBandeauCookies />
  </div>
</template>
