<script setup lang="ts">
/**
 * « Complétez votre profil apprenant — 60 % » (planche B, écrans 01, 06, 14).
 * Obligatoire à 100 % pour participer aux sessions de coaching.
 *
 * La maquette peint ce bandeau en violet clair sur fond blanc, pas en orange
 * d'alerte : ce n'est pas un avertissement, c'est une invitation à finir le
 * profil. La jauge reprend le rail `piste` et le remplissage `social` de toutes
 * les autres barres de progression de la planche.
 */
defineProps<{ completion: number; compact?: boolean }>()
</script>

<template>
  <div
    v-if="completion < 100"
    class="border-[1.5px] border-social-bordure-vive bg-white"
    :class="compact ? 'flex items-center justify-between gap-3 rounded-champ p-3.5' : 'flex items-center gap-[22px] rounded-bloc px-6 py-[18px]'"
    role="status"
  >
    <div class="min-w-0 flex-1">
      <p class="text-[15px] font-bold text-encre">
        {{ compact ? `Profil apprenant — ${completion} %` : `Complétez votre profil apprenant — ${completion} %` }}
      </p>
      <p v-if="!compact" class="mt-1 text-[13.5px] text-discret">
        Obligatoire à 100 % pour participer aux sessions de coaching. Vos réponses aident votre coach
        à personnaliser la session.
      </p>
      <div class="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-piste">
        <div class="h-full rounded-full bg-social" :style="{ width: `${completion}%` }" />
      </div>
    </div>
    <UiBaseButton to="/mon-espace/profil" taille="sm" class="shrink-0 whitespace-nowrap">
      {{ compact ? 'Compléter' : 'Terminer mon profil' }}
    </UiBaseButton>
  </div>
</template>
