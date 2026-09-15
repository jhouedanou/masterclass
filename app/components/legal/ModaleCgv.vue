<script setup lang="ts">
/**
 * Conditions générales de vente en surimpression, ouvertes depuis le
 * récapitulatif de commande.
 *
 * Le lien vers `/cgv` quittait la page : le panier est en mémoire (store
 * `achat`), et l'acheteur revenait devant une case à cocher qu'il devait
 * retrouver. La modale lui rend le document sans lui faire perdre sa place.
 * La page `/cgv` reste en ligne pour le pied de page et le référencement.
 */
const emit = defineEmits<{ fermer: [] }>()

const carte = ref<HTMLElement | null>(null)

/** Échappe ferme, comme partout ailleurs dans le navigateur. */
function auClavier(evenement: KeyboardEvent) {
  if (evenement.key === 'Escape') emit('fermer')
}

onMounted(() => {
  document.addEventListener('keydown', auClavier)
  // Le fond ne doit pas défiler derrière la modale ; le document, lui, défile.
  document.body.style.overflow = 'hidden'
  // Le focus entre dans la modale, sans quoi la lecture au clavier resterait
  // sur le lien qui vient de l'ouvrir, derrière le voile.
  carte.value?.focus()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', auClavier)
  document.body.style.overflow = ''
})
</script>

<template>
  <!-- Le clic sur le voile ferme ; celui sur la carte est arrêté à sa racine. -->
  <div
    class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-encre/50 p-4"
    @click="emit('fermer')"
  >
    <div
      ref="carte"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titre-cgv"
      tabindex="-1"
      class="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-carte bg-white focus:outline-none"
      @click.stop
    >
      <div class="flex items-start justify-between gap-4 border-b border-ligne-claire px-6 py-5">
        <div>
          <h2 id="titre-cgv" class="font-title text-[24px] font-light">
            Conditions générales de vente
          </h2>
          <p class="mt-1 text-[13px] text-discret">Dernière mise à jour : 1er août 2026</p>
        </div>
        <button
          type="button"
          class="grid size-9 shrink-0 place-items-center rounded-full text-discret hover:bg-fond-clair hover:text-encre"
          aria-label="Fermer"
          title="Fermer"
          @click="emit('fermer')"
        >
          <Icon name="ph:x" size="20" />
        </button>
      </div>

      <!-- Seul le corps défile : l'en-tête et le pied restent visibles. -->
      <div class="min-h-0 flex-1 overflow-y-auto px-6 py-1">
        <LegalTexteCgv />
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-ligne-claire px-6 py-4">
        <NuxtLink to="/cgv" target="_blank" class="text-[13.5px] text-discret underline hover:text-encre">
          Ouvrir la page complète
        </NuxtLink>
        <UiBaseButton taille="sm" variante="sombre" @click="emit('fermer')">
          J’ai lu
        </UiBaseButton>
      </div>
    </div>
  </div>
</template>
