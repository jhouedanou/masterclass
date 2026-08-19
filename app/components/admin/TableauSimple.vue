<script setup lang="ts">
defineProps<{ colonnes: string[] }>()
</script>

<template>
  <div class="overflow-x-auto rounded-[14px] border border-ligne-douce bg-white">
    <table class="w-full min-w-[640px] text-left text-[14px]">
      <thead class="border-b border-ligne-claire bg-fond-clair text-[12px] tracking-wider text-discret uppercase">
        <tr>
          <th v-for="colonne in colonnes" :key="colonne" class="px-4 py-3 font-bold">{{ colonne }}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-ligne-claire">
        <slot />
      </tbody>
    </table>
  </div>
</template>
