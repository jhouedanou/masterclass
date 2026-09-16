<script setup lang="ts">
/**
 * Barre d'onglets basse des espaces installés (planche B, écran 06 ; planche
 * D, écran 07). Visible sous le palier `lg`, remplacée par la barre latérale
 * au-delà.
 */
defineProps<{
  liens: { libelle: string; chemin: string; icone: string; compteur?: number }[]
  /** Couleur d'accent de l'espace : violet apprenant, violet formateur. */
  accent?: 'social' | 'entrepreneurs'
  /** Palier au-delà duquel la barre disparaît : `md` (apprenant, la tablette a une nav haute) ou `lg`. */
  jusqua?: 'md' | 'lg'
}>()
</script>

<template>
  <nav
    aria-label="Navigation principale"
    class="fixed inset-x-0 bottom-0 z-40 grid border-t border-ligne-claire bg-white pb-[env(safe-area-inset-bottom)]"
    :class="jusqua === 'md' ? 'md:hidden' : 'lg:hidden'"
    :style="{ gridTemplateColumns: `repeat(${liens.length}, minmax(0, 1fr))` }"
  >
    <NuxtLink
      v-for="lien in liens"
      :key="lien.chemin"
      :to="lien.chemin"
      class="relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold text-discret"
      :class="accent === 'entrepreneurs' ? 'aria-[current=page]:text-entrepreneurs' : 'aria-[current=page]:text-social'"
      active-class="est-actif"
    >
      <Icon :name="lien.icone" size="22" />
      <span>{{ lien.libelle }}</span>
      <span
        v-if="lien.compteur"
        class="absolute right-[calc(50%-22px)] top-1 grid min-w-[18px] place-items-center rounded-full bg-social px-1 text-[10px] font-bold text-white"
      >
        {{ lien.compteur }}
      </span>
    </NuxtLink>
  </nav>
</template>

<style scoped>
.est-actif {
  color: var(--color-social);
}
</style>
