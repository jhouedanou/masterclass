<script setup lang="ts">
import type { QuestionReponse } from '#shared/types'

/**
 * Accordéon de FAQ. Les maquettes le composent plus grand sur l'accueil
 * (question 16 px, marges 22/18) que sur les pages programme, module et
 * contact (question 14,5 px, marges 20/15). La phase 1 employait partout les
 * valeurs de l'accueil.
 */
const props = withDefaults(
  defineProps<{
    questions: QuestionReponse[]
    ouvertParDefaut?: number
    taille?: 'md' | 'sm'
  }>(),
  { taille: 'md' },
)
const petit = computed(() => props.taille === 'sm')
const ouvert = ref<number | null>(props.ouvertParDefaut ?? 0)

function basculer(i: number) {
  ouvert.value = ouvert.value === i ? null : i
}
</script>

<template>
  <div class="flex flex-col" :class="petit ? 'gap-2.5' : 'gap-3'">
    <div
      v-for="(item, i) in questions"
      :key="item.question"
      class="rounded-[12px] border border-ligne-tendre"
      :class="petit ? 'px-5 py-[15px]' : 'px-6 py-[18px]'"
    >
      <h3 class="font-sans">
        <button
          class="flex w-full items-center justify-between gap-4 text-left font-bold text-encre"
          :class="petit ? 'text-[14.5px]' : 'text-[16px]'"
          :aria-expanded="ouvert === i"
          @click="basculer(i)"
        >
          <span>{{ item.question }}</span>
          <span aria-hidden="true" class="text-lg">{{ ouvert === i ? '−' : '+' }}</span>
        </button>
      </h3>
      <p
        v-if="ouvert === i"
        class="mt-2.5 leading-relaxed text-texte"
        :class="petit ? 'text-[14px]' : 'text-[14.5px]'"
      >
        {{ item.reponse }}
      </p>
    </div>
  </div>
</template>
