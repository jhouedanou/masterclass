<script setup lang="ts">
/**
 * La pile de messages, posée une fois dans la mise en page.
 *
 * `aria-live="polite"` plutôt que `assertive` : une confirmation de duplication
 * n'a pas à couper la phrase qu'un lecteur d'écran est en train de dire. Le
 * conteneur existe en permanence, même vide — une région annoncée qui
 * apparaîtrait en même temps que son contenu ne serait pas lue.
 */
const { toasts, retirer } = useToasts()
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4"
    role="status"
    aria-live="polite"
  >
    <TransitionGroup
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="translate-y-1 opacity-0"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex max-w-[min(92vw,460px)] items-start gap-3 rounded-[12px] px-4 py-3 text-[13px] shadow-[0_10px_30px_rgba(23,21,28,.18)]"
        :class="
          toast.ton === 'erreur'
            ? 'border border-erreur-bordure bg-erreur-voile text-erreur-fonce'
            : 'border border-succes bg-succes-voile text-succes'
        "
      >
        <span class="min-w-0 flex-1">{{ toast.texte }}</span>
        <button
          class="shrink-0 font-bold opacity-60 transition hover:opacity-100"
          aria-label="Fermer ce message"
          @click="retirer(toast.id)"
        >
          ✕
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
