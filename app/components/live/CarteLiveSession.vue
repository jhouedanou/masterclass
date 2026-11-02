<script setup lang="ts">
import type { Formateur, LiveSession } from '#shared/types'

/** Carte d'une Live Session : liste, accueil. Toute la carte mène à la fiche. */
defineProps<{
  live: LiveSession & { formateur: Pick<Formateur, 'nom' | 'photo' | 'photoAlt'> | null; passee?: boolean }
  /** Fond sombre (accueil). */
  clair?: boolean
}>()
</script>

<template>
  <NuxtLink
    :to="`/live-sessions/${live.slug}`"
    class="group flex h-full flex-col rounded-carte border p-6 transition hover:-translate-y-0.5"
    :class="clair ? 'border-white/15 bg-white/5 text-white hover:bg-white/10' : 'border-ligne-douce bg-white hover:border-encre'"
  >
    <p class="surtitre" :class="clair ? 'text-white/70' : 'text-social'">
      {{ live.passee ? 'Session passée' : formatDateCourte(live.date) }} · {{ live.heure }}
    </p>
    <h3 class="mt-3 font-title text-[21px] leading-snug font-light">{{ live.titre }}</h3>
    <p v-if="live.resume" class="mt-2 line-clamp-3 text-[14px] leading-relaxed" :class="clair ? 'text-white/80' : 'text-texte'">
      {{ live.resume }}
    </p>
    <div class="mt-auto flex items-center gap-3 pt-5">
      <img
        v-if="live.formateur?.photo"
        :src="live.formateur.photo"
        :alt="live.formateur.photoAlt || `Portrait de ${live.formateur.nom}`"
        class="size-9 rounded-full object-cover"
        width="36"
        height="36"
        loading="lazy"
      >
      <span class="text-[13.5px] font-semibold">{{ live.formateur?.nom }}</span>
      <span class="ml-auto text-[14px] font-bold">{{ live.prixFcfa > 0 ? formatFcfa(live.prixFcfa) : 'Gratuit' }}</span>
    </div>
  </NuxtLink>
</template>
