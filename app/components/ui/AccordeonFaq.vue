<script setup lang="ts">
import type { QuestionReponse } from '#shared/types'

const props = defineProps<{ questions: QuestionReponse[]; ouvertParDefaut?: number }>()
const ouvert = ref<number | null>(props.ouvertParDefaut ?? 0)

function basculer(i: number) {
  ouvert.value = ouvert.value === i ? null : i
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div
      v-for="(item, i) in questions"
      :key="item.question"
      class="rounded-[12px] border border-ligne-tendre px-6 py-[18px]"
    >
      <h3 class="font-sans">
        <button
          class="flex w-full items-center justify-between gap-4 text-left text-[16px] font-bold text-encre"
          :aria-expanded="ouvert === i"
          @click="basculer(i)"
        >
          <span>{{ item.question }}</span>
          <span aria-hidden="true" class="text-lg">{{ ouvert === i ? '−' : '+' }}</span>
        </button>
      </h3>
      <p v-if="ouvert === i" class="mt-2.5 text-[14.5px] leading-relaxed text-texte">
        {{ item.reponse }}
      </p>
    </div>
  </div>
</template>
