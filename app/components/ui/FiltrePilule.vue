<script setup lang="ts">
/**
 * Filtre en pilule du back-office et de l'espace formateur (planche C, écrans
 * 01, 03, 18, 21 ; planche D, écrans 01, 03 et 06) : « Septembre 2026 ▾ »,
 * « Tous programmes ▾ », « 🗓 Période : 30 derniers jours ▾ ». Les maquettes
 * la dessinent partout de la même façon — fond blanc, bordure #dcd7e6, coins
 * pleinement arrondis, graisse 600 — d'où sa place dans `ui/`.
 *
 * C'est un `select` natif : le clavier, le lecteur d'écran et les sélecteurs
 * du téléphone fonctionnent sans code supplémentaire ; seule l'apparence suit
 * la maquette.
 *
 * Un `select` se dimensionne sur son option la plus longue, pas sur la valeur
 * choisie : sans plafond, la pilule « Module » s'étirait sur un tiers de la
 * ligne de filtres. La maquette les dessine toutes de largeur comparable.
 */
defineProps<{
  /** Libellé accessible, non affiché : la pilule se lit d'elle-même. */
  etiquette: string
  options: { valeur: string; libelle: string }[]
  /** Préfixe affiché devant la valeur, « 🗓 Période : » par exemple. */
  prefixe?: string
}>()

const valeur = defineModel<string>({ required: true })
</script>

<template>
  <label class="relative inline-flex items-center rounded-full border border-ligne bg-white text-[13px] font-semibold">
    <span class="sr-only">{{ etiquette }}</span>
    <span v-if="prefixe" class="pointer-events-none py-2.5 pl-4 text-discret">{{ prefixe }}</span>
    <select
      v-model="valeur"
      class="max-w-[190px] cursor-pointer appearance-none truncate bg-transparent py-2.5 pr-8 text-encre focus:outline-none"
      :class="prefixe ? 'pl-1' : 'pl-4'"
    >
      <option v-for="option in options" :key="option.valeur" :value="option.valeur">
        {{ option.libelle }}
      </option>
    </select>
    <Icon name="ph:caret-down" size="14" class="pointer-events-none absolute right-3 text-discret" />
  </label>
</template>
