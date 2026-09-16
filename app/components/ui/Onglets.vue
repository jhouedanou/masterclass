<script setup lang="ts">
/**
 * Onglets accessibles (rôle `tablist`) partagés par le back-office : éditeur
 * de module, performances, paramètres, blog, référencement.
 *
 * Les maquettes n'emploient jamais l'onglet souligné. Elles ont deux formes :
 *   - `pilules` — la forme courante (écrans 18, 20, 22, 23) : pilule pleine
 *     pour l'onglet actif, pilule blanche bordée pour les autres ;
 *   - `dossier` — l'éditeur de module (écran 09) : onglets soudés au panneau,
 *     coins supérieurs arrondis, filet violet de 3 px sur l'actif.
 *
 * `accent` choisit la couleur de l'onglet actif en forme pilule : encre par
 * défaut, violet sur les paramètres et l'éditeur d'article. `taille` passe en
 * `sm` pour les sous-onglets, plus petits dans les maquettes que les onglets
 * de premier niveau.
 */
export interface Onglet {
  cle: string
  libelle: string
  compteur?: number
  verrouille?: boolean
  /** Précision en petit à droite du libellé, ex. « (écrans 07 · 07b) ». */
  note?: string
  /** Signale un état « À compléter » par une pastille orange. */
  alerte?: boolean
}

const props = withDefaults(
  defineProps<{
    onglets: Onglet[]
    modelValue: string
    variante?: 'pilules' | 'dossier'
    accent?: 'encre' | 'social'
    taille?: 'sm' | 'md'
  }>(),
  { variante: 'pilules', accent: 'encre', taille: 'md' },
)
const emit = defineEmits<{ 'update:modelValue': [cle: string] }>()

const dossier = computed(() => props.variante === 'dossier')

const classesListe = computed(() =>
  dossier.value
    ? 'flex flex-wrap items-stretch gap-0.5 text-[13.5px] font-bold'
    : `flex flex-wrap gap-2 font-bold ${props.taille === 'sm' ? 'text-[11.5px]' : 'text-[13px]'}`,
)

function classesOnglet(actif: boolean) {
  if (dossier.value) {
    const base = 'flex items-center gap-1.5 rounded-t-[10px] border border-b-0 border-ligne-douce px-[22px] py-3'
    return actif
      ? `${base} border-t-[3px] border-t-social bg-white text-social`
      : `${base} bg-ligne-claire text-discret hover:text-encre`
  }
  const base =
    props.taille === 'sm'
      ? 'flex items-center gap-1.5 rounded-full px-3 py-1.5'
      : 'flex items-center gap-1.5 rounded-full px-[18px] py-2.5'
  if (actif) {
    return `${base} ${props.accent === 'social' ? 'bg-social' : 'bg-encre'} text-white`
  }
  return `${base} border-[1.5px] border-ligne bg-white text-texte hover:border-discret-clair`
}
</script>

<template>
  <div role="tablist" :class="classesListe">
    <button
      v-for="o in onglets"
      :key="o.cle"
      :id="`onglet-${o.cle}`"
      role="tab"
      type="button"
      :aria-selected="modelValue === o.cle"
      :aria-controls="`panneau-${o.cle}`"
      :class="classesOnglet(modelValue === o.cle)"
      @click="emit('update:modelValue', o.cle)"
    >
      {{ o.libelle }}
      <span v-if="o.compteur !== undefined">({{ o.compteur }})</span>
      <Icon v-if="o.verrouille" name="ph:lock-simple" size="13" />
      <span
        v-if="o.note"
        class="text-[11px] font-semibold"
        :class="modelValue === o.cle ? 'opacity-70' : 'text-discret'"
      >{{ o.note }}</span>
      <span v-if="o.alerte" class="size-2 rounded-full bg-alerte" aria-label="À compléter" />
    </button>
  </div>
</template>
