<script setup lang="ts">
/**
 * Interrupteur des maquettes (B-11, A-10 cookies, C-03, C-19, C-24).
 * Piste de 40 × 22 px, pastille de 18 px ; allumé en vert `whatsapp`, éteint
 * en gris perle. La phase 1 l'avait dessiné en 44 × 24 violet, teinte que la
 * maquette n'emploie sur aucun interrupteur.
 */
defineProps<{ modelValue: boolean; libelle: string; description?: string; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [valeur: boolean] }>()
</script>

<template>
  <label class="flex cursor-pointer items-start justify-between gap-4 py-3" :class="{ 'cursor-not-allowed opacity-60': disabled }">
    <span>
      <span class="block text-[14px] font-semibold text-encre">{{ libelle }}</span>
      <span v-if="description" class="mt-0.5 block text-[13px] text-discret">{{ description }}</span>
    </span>
    <button
      type="button"
      role="switch"
      :aria-checked="modelValue"
      :aria-label="libelle"
      :disabled="disabled"
      class="relative mt-0.5 h-[22px] w-10 shrink-0 rounded-full transition-colors"
      :class="modelValue ? 'bg-whatsapp' : 'bg-gris-perle'"
      @click="emit('update:modelValue', !modelValue)"
    >
      <span
        class="absolute top-0.5 size-[18px] rounded-full bg-white shadow transition-transform"
        :class="modelValue ? 'translate-x-5' : 'translate-x-0.5'"
      />
    </button>
  </label>
</template>
