<script setup lang="ts">
import type { EntreeReferentiel } from '#shared/utils/referentiels'
import { joindreCles, separerCles } from '#shared/utils/referentiels'

/**
 * Choix multiple dans un référentiel : réseaux gérés, outils, canaux de vente.
 *
 * Des pastilles à bascule plutôt qu'un `<select multiple>`, illisible au doigt
 * et qui cache les choix faits. Tout est visible d'un coup d'œil, et la
 * sélection se lit sans ouvrir quoi que ce soit.
 *
 * Le composant émet la valeur stockée — les clés jointes par des virgules —
 * jamais les libellés.
 */
const props = defineProps<{
  modelValue?: string | null
  /** Entrées actives de la catégorie, déjà triées. */
  entrees: EntreeReferentiel[]
  disabled?: boolean
  id?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [valeur: string] }>()

const choisies = ref<string[]>(separerCles(props.modelValue))

/**
 * Clés que le référentiel ne reconnaît pas : valeur d'avant la reprise, ou
 * entrée depuis retirée. Elles restent affichées et cochées — les escamoter
 * reviendrait à effacer silencieusement la réponse de l'apprenant au premier
 * enregistrement d'une fiche qu'il n'a pas modifiée sur ce point.
 */
const orphelines = computed(() =>
  choisies.value.filter((cle) => !props.entrees.some((e) => e.cle === cle)),
)

function basculer(cle: string) {
  if (props.disabled) return
  choisies.value = choisies.value.includes(cle)
    ? choisies.value.filter((c) => c !== cle)
    : [...choisies.value, cle]
  emit('update:modelValue', joindreCles(choisies.value))
}

/** Suit la valeur quand elle change ailleurs — rechargement après
 *  enregistrement — sans défaire une sélection en cours. */
watch(
  () => props.modelValue,
  (valeur) => {
    if (valeur === joindreCles(choisies.value)) return
    choisies.value = separerCles(valeur)
  },
)
</script>

<template>
  <div :id="id" role="group" class="flex flex-wrap gap-2">
    <button
      v-for="entree in entrees"
      :key="entree.cle"
      type="button"
      :disabled="disabled"
      :aria-pressed="choisies.includes(entree.cle)"
      class="rounded-full border px-3 py-1.5 text-[13px] transition disabled:opacity-50"
      :class="
        choisies.includes(entree.cle)
          ? 'border-social bg-social-voile font-bold text-social'
          : 'border-ligne text-texte hover:border-discret'
      "
      @click="basculer(entree.cle)"
    >
      {{ entree.libelle }}
    </button>

    <button
      v-for="cle in orphelines"
      :key="cle"
      type="button"
      :disabled="disabled"
      aria-pressed="true"
      title="Valeur enregistrée avant la mise en place de la liste"
      class="rounded-full border border-ligne bg-fond-voile px-3 py-1.5 text-[13px] text-discret italic transition disabled:opacity-50"
      @click="basculer(cle)"
    >
      {{ cle }} ×
    </button>

    <p v-if="!entrees.length && !orphelines.length" class="text-[13px] text-discret">
      Aucune valeur proposée pour l’instant.
    </p>
  </div>
</template>
