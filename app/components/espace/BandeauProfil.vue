<script setup lang="ts">
/**
 * « Complétez votre profil apprenant — 60 % » (planche B, écrans 01, 06, 14).
 * Obligatoire à 100 % pour participer aux sessions de coaching.
 */
defineProps<{ completion: number; compact?: boolean }>()
</script>

<template>
  <div
    v-if="completion < 100"
    class="rounded-[14px] border border-alerte bg-alerte-voile"
    :class="compact ? 'flex items-center justify-between gap-3 px-4 py-3' : 'p-5'"
    role="status"
  >
    <div class="min-w-0 flex-1">
      <p class="text-[14px] font-bold text-encre">
        {{ compact ? `Profil apprenant — ${completion} %` : `Complétez votre profil apprenant — ${completion} %` }}
      </p>
      <p v-if="!compact" class="mt-1 text-[13.5px] text-texte">
        Obligatoire à 100 % pour participer aux sessions de coaching. Vos réponses aident votre coach
        à personnaliser la session.
      </p>
      <div class="mt-2 h-1.5 w-full rounded-full bg-white/70">
        <div class="h-full rounded-full bg-alerte" :style="{ width: `${completion}%` }" />
      </div>
    </div>
    <UiBaseButton to="/mon-espace/profil" taille="sm" :class="compact ? 'shrink-0' : 'mt-4'">
      {{ compact ? 'Compléter' : 'Terminer mon profil' }}
    </UiBaseButton>
  </div>
</template>
