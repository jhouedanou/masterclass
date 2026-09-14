<script setup lang="ts">
/**
 * Onglets accessibles (rôle `tablist`) partagés par le back-office : éditeur
 * de module, performances, paramètres, blog, référencement. Chaque onglet
 * peut porter un compteur « (3) » et une icône de verrou.
 */
export interface Onglet {
  cle: string
  libelle: string
  compteur?: number
  verrouille?: boolean
  /** Signale un état « À compléter » par une pastille orange. */
  alerte?: boolean
}

defineProps<{ onglets: Onglet[]; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [cle: string] }>()
</script>

<template>
  <div role="tablist" class="flex flex-wrap gap-1 border-b border-ligne-claire">
    <button
      v-for="o in onglets"
      :key="o.cle"
      role="tab"
      type="button"
      :aria-selected="modelValue === o.cle"
      :id="`onglet-${o.cle}`"
      :aria-controls="`panneau-${o.cle}`"
      class="-mb-px flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[14px] font-semibold"
      :class="modelValue === o.cle ? 'border-social text-social' : 'border-transparent text-discret hover:text-encre'"
      @click="emit('update:modelValue', o.cle)"
    >
      {{ o.libelle }}
      <span v-if="o.compteur !== undefined" class="text-[12px] font-normal">({{ o.compteur }})</span>
      <Icon v-if="o.verrouille" name="ph:lock-simple" size="13" />
      <span v-if="o.alerte" class="size-2 rounded-full bg-alerte" aria-label="À compléter" />
    </button>
  </div>
</template>
