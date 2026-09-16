<script setup lang="ts">
/**
 * Carte d'indicateur du back-office. Les maquettes ne composent pas la valeur
 * à la même taille selon l'écran : 30 px sur la vue d'ensemble, 29 px sur
 * Performances, 24 px sur les onglets Ventes / Visites / Clients et la vue
 * tablette, 23 px sur Revenus. La phase 1 la figeait à 28 px partout.
 *
 * `accent` ne change que la bordure et la couleur du libellé : la maquette ne
 * pose jamais de fond teinté sur une carte accentuée.
 */
const props = withDefaults(
  defineProps<{
    libelle: string
    valeur: string
    detail?: string
    accent?: boolean
    taille?: 'xl' | 'lg' | 'md' | 'sm'
  }>(),
  { taille: 'lg' },
)

const VALEURS = { xl: 'text-[30px]', lg: 'text-[29px]', md: 'text-[24px]', sm: 'text-[23px]' }
const LIBELLES = { xl: 'text-[12.5px]', lg: 'text-[12.5px]', md: 'text-[12px]', sm: 'text-[12px]' }
const MARGES = { xl: 'p-5', lg: 'p-5', md: 'p-[18px]', sm: 'p-[18px]' }

const classeValeur = computed(() => VALEURS[props.taille])
const classeLibelle = computed(() => LIBELLES[props.taille])
const classeMarge = computed(() => MARGES[props.taille])
</script>

<template>
  <div
    class="rounded-[14px] bg-white"
    :class="[classeMarge, accent ? 'border-[1.5px] border-social' : 'border border-ligne-douce']"
  >
    <p :class="[classeLibelle, accent ? 'text-social' : 'text-discret']">{{ libelle }}</p>
    <p class="mt-1 font-title leading-tight font-light" :class="classeValeur">{{ valeur }}</p>
    <p v-if="detail" class="mt-1 text-[11px] text-discret">{{ detail }}</p>
  </div>
</template>
