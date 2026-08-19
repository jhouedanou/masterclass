<script setup lang="ts">
const props = defineProps<{
  titre: string
  sousTitre: string
  contexte: string
  prive?: boolean
  valeurInitiale?: string
}>()
const emit = defineEmits<{ fermer: []; envoyer: [{ preoccupation: string; attente: string }] }>()

const preoccupation = ref(props.valeurInitiale ?? '')
const attente = ref('')
const erreur = ref('')

// Réponses obligatoires : le bouton reste inactif tant qu'elles sont vides.
const valide = computed(() =>
  props.prive ? preoccupation.value.trim().length > 0 : preoccupation.value.trim() && attente.value.trim(),
)

function envoyer() {
  if (!valide.value) {
    erreur.value = 'Les réponses sont obligatoires.'
    return
  }
  emit('envoyer', { preoccupation: preoccupation.value, attente: attente.value })
}
</script>

<template>
  <div class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-encre/50 p-4">
    <div class="w-full max-w-xl rounded-carte bg-white p-6">
      <h2 class="font-title text-[21px] font-light">{{ titre }}</h2>
      <p class="mt-1 text-[13.5px] text-discret">{{ sousTitre }}</p>

      <form class="mt-5 space-y-4" @submit.prevent="envoyer">
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">{{ contexte }} *</span>
          <textarea v-model="preoccupation" rows="3" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]" />
        </label>

        <label v-if="!prive" class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">
            Qu’attendez-vous concrètement de cette session ? *
          </span>
          <textarea v-model="attente" rows="3" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]" />
        </label>

        <label v-else class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">
            Documents ou exemples à examiner ensemble (optionnel)
          </span>
          <input v-model="attente" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
        </label>

        <p v-if="erreur" class="text-[13.5px] text-erreur">{{ erreur }}</p>

        <div class="flex flex-wrap gap-2">
          <UiBaseButton type="submit" taille="sm" :disabled="!valide">
            {{ prive ? 'Envoyer et rejoindre la session →' : 'Envoyer mes réponses et réserver ma place' }}
          </UiBaseButton>
          <UiBaseButton taille="sm" variante="contour" @click="emit('fermer')">Annuler</UiBaseButton>
        </div>
      </form>

      <p class="mt-4 text-[12px] text-discret">
        {{
          prive
            ? 'Étape obligatoire : impossible d’entrer dans la salle sans soumettre les sujets. Le formateur les reçoit instantanément.'
            : 'Ces réponses sont transmises au formateur avant la session, pour préparer les cas pratiques.'
        }}
      </p>
    </div>
  </div>
</template>
