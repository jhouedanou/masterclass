<script setup lang="ts">
/**
 * Carte d'indicateur du back-office. Les maquettes ne composent pas la valeur
 * à la même taille selon l'écran : 30 px sur la vue d'ensemble, 29 px sur
 * Performances, 24 px sur les onglets Ventes / Visites / Clients et la vue
 * tablette, 23 px sur Revenus. La phase 1 la figeait à 28 px partout.
 *
 * `accent` ne change que la bordure et la couleur du libellé : la maquette ne
 * pose jamais de fond teinté sur une carte accentuée.
 *
 * L'unité — « FCFA », « F » — se compose plus petit que le nombre : 15 px sous
 * une valeur de 30 px, 14 px sous 29 px, 12 px sous les deux tailles basses.
 * Le détail suit lui aussi la taille : 12 px sur la vue d'ensemble et sur
 * Performances, 11 px sur Revenus. `detailAccent` le passe en vert gras, forme
 * que la maquette réserve à l'écart favorable (« 69 % de l'objectif »).
 */
const props = withDefaults(
  defineProps<{
    libelle: string
    valeur: string
    /** Unité composée plus petit, à droite de la valeur. */
    unite?: string
    detail?: string
    detailAccent?: boolean
    accent?: boolean
    taille?: 'xl' | 'lg' | 'md' | 'sm'
  }>(),
  { taille: 'lg' },
)

const VALEURS = { xl: 'text-[30px]', lg: 'text-[29px]', md: 'text-[24px]', sm: 'text-[23px]' }
const UNITES = { xl: 'text-[15px]', lg: 'text-[14px]', md: 'text-[12px]', sm: 'text-[12px]' }
const LIBELLES = { xl: 'text-[12.5px]', lg: 'text-[12.5px]', md: 'text-[12px]', sm: 'text-[12px]' }
const DETAILS = { xl: 'text-[12px]', lg: 'text-[12px]', md: 'text-[11px]', sm: 'text-[11px]' }
const MARGES = { xl: 'p-5', lg: 'p-5', md: 'p-[18px]', sm: 'p-[18px]' }

const classeValeur = computed(() => VALEURS[props.taille])
const classeUnite = computed(() => UNITES[props.taille])
const classeLibelle = computed(() => LIBELLES[props.taille])
const classeDetail = computed(() => DETAILS[props.taille])
const classeMarge = computed(() => MARGES[props.taille])
</script>

<template>
  <div
    class="rounded-[14px] bg-white"
    :class="[classeMarge, accent ? 'border-[1.5px] border-social' : 'border border-ligne-douce']"
  >
    <p class="mb-1.5" :class="[classeLibelle, accent ? 'font-bold text-social' : 'text-discret']">{{ libelle }}</p>
    <p class="font-title leading-tight font-light" :class="classeValeur">
      {{ valeur }}<span v-if="unite" class="font-sans font-normal" :class="classeUnite">{{ ' ' }}{{ unite }}</span>
    </p>
    <p
      v-if="detail"
      class="mt-1"
      :class="[classeDetail, detailAccent ? 'font-bold text-succes' : 'text-discret']"
    >
      {{ detail }}
    </p>
  </div>
</template>
