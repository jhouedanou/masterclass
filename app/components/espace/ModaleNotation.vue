<script setup lang="ts">
defineProps<{ titre: string; sousTitre: string }>()
const emit = defineEmits<{ fermer: []; envoyer: [{ note: number; commentaire: string }] }>()

const note = ref(0)
const commentaire = ref('')

const libelles = ['', 'Très insatisfait(e)', 'Insatisfait(e)', 'Correct', 'Satisfait(e)', 'Très satisfait(e)']
</script>

<template>
  <div class="fixed inset-0 z-50 grid place-items-center bg-encre/50 p-4">
    <div class="w-full max-w-md rounded-carte bg-white p-6">
      <h2 class="font-title text-[21px] font-light">{{ titre }}</h2>
      <p class="mt-1 text-[13.5px] text-discret">{{ sousTitre }}</p>

      <div class="mt-5 flex items-center gap-2" role="radiogroup" aria-label="Note du formateur">
        <button
          v-for="i in 5"
          :key="i"
          type="button"
          class="text-[28px] leading-none"
          :class="i <= note ? 'text-alerte' : 'text-ligne'"
          role="radio"
          :aria-checked="note === i"
          :aria-label="`${i} sur 5`"
          @click="note = i"
        >
          ★
        </button>
        <span v-if="note" class="ml-2 text-[13.5px] text-texte">{{ note }} / 5 — {{ libelles[note] }}</span>
      </div>

      <label class="mt-4 block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">
          Un commentaire pour le formateur ? (optionnel)
        </span>
        <textarea v-model="commentaire" rows="3" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]" />
      </label>

      <div class="mt-5 flex flex-wrap gap-2">
        <UiBaseButton taille="sm" :disabled="!note" @click="emit('envoyer', { note, commentaire })">
          Envoyer ma note
        </UiBaseButton>
        <UiBaseButton taille="sm" variante="contour" @click="emit('fermer')">Plus tard</UiBaseButton>
      </div>

      <p class="mt-4 text-[12px] text-discret">
        La note moyenne est visible de l’administration et du formateur — jamais publiée sur le site.
      </p>
    </div>
  </div>
</template>
