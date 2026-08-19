<script setup lang="ts">
defineProps<{
  surtitre: string
  titre: string
  intro?: string
  ton?: 'discret' | 'social' | 'entrepreneurs' | 'clair'
  clair?: boolean
}>()
</script>

<template>
  <div>
    <UiSurtitre :ton="ton">{{ surtitre }}</UiSurtitre>
    <h2 class="mt-2.5 text-[34px] font-light" :class="clair && 'text-white'">{{ titre }}</h2>
    <p
      v-if="intro"
      class="mt-2.5 max-w-[760px] text-[16px] leading-relaxed"
      :class="clair ? 'text-[#b9b4c4]' : 'text-texte'"
    >
      {{ intro }}
    </p>
  </div>
</template>
