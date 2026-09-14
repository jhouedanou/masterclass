<script setup lang="ts">
/** Interrupteur (toggle) des maquettes B-11, C-03 et C-19. */
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
      class="relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors"
      :class="modelValue ? 'bg-social' : 'bg-ligne'"
      @click="emit('update:modelValue', !modelValue)"
    >
      <span
        class="absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform"
        :class="modelValue ? 'translate-x-[22px]' : 'translate-x-0.5'"
      />
    </button>
  </label>
</template>
