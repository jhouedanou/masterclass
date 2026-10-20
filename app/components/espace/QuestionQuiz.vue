<script setup lang="ts">
import type { CorrectionQuiz, QuestionQuiz } from '#shared/types'

/**
 * Une question du quiz : énoncé, quatre propositions en boutons radio, puis,
 * une fois la copie corrigée, la justification (réussie) ou la piste et les
 * chapitres à revoir (manquée). La bonne réponse n'est jamais montrée : seule
 * la lettre choisie par l'apprenant reste cochée.
 */
const props = defineProps<{
  question: QuestionQuiz
  numero: number
  total: number
  slug: string
  modelValue?: string
  correction?: CorrectionQuiz
  desactive?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [lettre: string] }>()

const idCorrection = computed(() => `correction-${props.question.code}`)

function horloge(secondes: number): string {
  const s = Math.max(0, Math.floor(secondes))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** Le libellé livré finit par « (vers 01:04) » : l'instant est déjà dans le lien. */
function sansInstant(libelle: string): string {
  return libelle.replace(/\s*\(vers [^)]*\)\s*$/, '')
}
</script>

<template>
  <fieldset
    class="min-w-0 rounded-carte border bg-white p-[22px]"
    :class="
      correction
        ? correction.correct
          ? 'border-succes-bordure'
          : 'border-erreur-bordure'
        : 'border-ligne-douce'
    "
    :aria-describedby="correction ? idCorrection : undefined"
  >
    <legend class="float-left mb-4 w-full">
      <span class="flex flex-wrap items-center justify-between gap-2 text-[12.5px] font-bold text-discret">
        <span>Question {{ numero }} / {{ total }}</span>
        <span
          v-if="correction"
          class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px]"
          :class="correction.correct ? 'bg-succes-voile text-succes-fonce' : 'bg-erreur-voile text-erreur-fonce'"
        >
          <Icon :name="correction.correct ? 'ph:check-circle-fill' : 'ph:x-circle-fill'" class="size-3.5" />
          {{ correction.correct ? 'Réussie' : 'À revoir' }}
        </span>
      </span>
      <span class="mt-1.5 block text-[15.5px] leading-[1.55] font-bold text-encre">{{ question.enonce }}</span>
    </legend>

    <div class="clear-both flex flex-col gap-2">
      <label
        v-for="option in question.options"
        :key="option.id"
        class="flex items-start gap-3 rounded-champ border px-4 py-3 text-[14px] leading-[1.5] transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-social"
        :class="[
          modelValue === option.id ? 'border-social bg-social-neige' : 'border-ligne-douce',
          desactive ? 'cursor-default' : 'cursor-pointer hover:border-social-clair',
        ]"
      >
        <input
          type="radio"
          class="mt-[3px] size-4 shrink-0 accent-social"
          :name="`question-${question.code}`"
          :value="option.id"
          :checked="modelValue === option.id"
          :disabled="desactive"
          @change="emit('update:modelValue', option.id)"
        >
        <span class="w-4 shrink-0 font-extrabold text-social">{{ option.id }}</span>
        <span class="text-texte">{{ option.texte }}</span>
      </label>
    </div>

    <div
      v-if="correction"
      :id="idCorrection"
      class="mt-4 rounded-champ px-4 py-3 text-[13.5px] leading-[1.6]"
      :class="correction.correct ? 'bg-succes-pale text-succes-fonce' : 'bg-erreur-voile text-erreur-fonce'"
    >
      <p v-if="correction.correct">{{ correction.justification }}</p>
      <template v-else>
        <p><b>Piste :</b> {{ correction.piste }}</p>
        <ul v-if="correction.renvois.length" class="mt-2.5 flex flex-col gap-1.5">
          <li v-for="renvoi in correction.renvois" :key="`${renvoi.position}-${renvoi.debutS}`">
            <NuxtLink
              :to="`/mon-espace/lecture/${slug}?chapitre=${renvoi.position}&reprise=${Math.floor(renvoi.debutS)}`"
              class="inline-flex items-start gap-1.5 font-bold underline-offset-2 hover:underline focus-visible:rounded-[4px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erreur-fonce"
            >
              <Icon name="ph:play-circle-fill" class="mt-[3px] size-4 shrink-0" />
              <span>{{ sansInstant(renvoi.libelle) }} — revoir à ce moment ({{ horloge(renvoi.debutS) }})</span>
            </NuxtLink>
          </li>
        </ul>
      </template>
    </div>
  </fieldset>
</template>
