<script setup lang="ts">
defineProps<{ libelle: string; valeur: string; detail?: string; accent?: boolean }>()
</script>

<template>
  <div
    class="rounded-[14px] border p-5"
    :class="accent ? 'border-social bg-social-voile' : 'border-ligne-douce bg-white'"
  >
    <p class="text-[13px]" :class="accent ? 'text-social' : 'text-discret'">{{ libelle }}</p>
    <p class="mt-1 font-title text-[28px] leading-tight font-light">{{ valeur }}</p>
    <p v-if="detail" class="mt-1 text-[12px] text-discret">{{ detail }}</p>
  </div>
</template>
