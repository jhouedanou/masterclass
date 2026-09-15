<script setup lang="ts">
import { separerCles } from '#shared/utils/referentiels'

/**
 * Saisie libre à plusieurs valeurs : « Clients / marques accompagnés ».
 *
 * Contrairement aux réseaux ou aux outils, ces valeurs ne peuvent pas venir
 * d'un référentiel — ce sont les noms des clients de l'apprenant, propres à
 * chacun. On ne peut donc pas contraindre le contenu, seulement la forme : une
 * valeur par pastille, au lieu d'une phrase où tout est mêlé.
 *
 * Le composant émet la même convention que les autres champs multiples : les
 * valeurs jointes par des virgules. La virgule est de ce fait interdite dans
 * une valeur — elle vaut validation, comme Entrée.
 */
const props = defineProps<{
  modelValue?: string | null
  disabled?: boolean
  id?: string
  placeholder?: string
  /** Garde-fou de saisie, pas une règle métier : au-delà, la fiche n'est plus lisible. */
  maximum?: number
}>()
const emit = defineEmits<{ 'update:modelValue': [valeur: string] }>()

const MAX_PAR_DEFAUT = 12
const LONGUEUR_MAX = 60

const valeurs = ref<string[]>(separerCles(props.modelValue))
const saisie = ref('')

const plein = computed(() => valeurs.value.length >= (props.maximum ?? MAX_PAR_DEFAUT))

function publier() {
  emit('update:modelValue', valeurs.value.join(','))
}

function ajouter() {
  // La virgule est le séparateur de stockage : un collage de « A, B, C » se
  // découpe donc en trois pastilles plutôt que d'être refusé.
  const candidats = saisie.value
    .split(',')
    .map((v) => v.trim().slice(0, LONGUEUR_MAX))
    .filter(Boolean)

  let ajoutees = false
  for (const candidat of candidats) {
    if (plein.value) break
    // Comparaison insensible à la casse : « Nana Beauté » et « nana beauté »
    // sont la même marque, et deux pastilles jumelles n'apprendraient rien.
    if (valeurs.value.some((v) => v.toLowerCase() === candidat.toLowerCase())) continue
    valeurs.value.push(candidat)
    ajoutees = true
  }

  saisie.value = ''
  if (ajoutees) publier()
}

function retirer(valeur: string) {
  if (props.disabled) return
  valeurs.value = valeurs.value.filter((v) => v !== valeur)
  publier()
}

/** Retour arrière sur un champ vide : retire la dernière pastille. */
function reculer() {
  if (saisie.value || !valeurs.value.length) return
  valeurs.value.pop()
  publier()
}

watch(
  () => props.modelValue,
  (valeur) => {
    if (valeur === valeurs.value.join(',')) return
    valeurs.value = separerCles(valeur)
  },
)
</script>

<template>
  <div>
    <ul v-if="valeurs.length" class="mb-2 flex flex-wrap gap-2">
      <li
        v-for="valeur in valeurs"
        :key="valeur"
        class="flex items-center gap-1.5 rounded-full border border-social bg-social-voile py-1.5 pr-2 pl-3 text-[13px] font-bold text-social"
      >
        {{ valeur }}
        <button
          type="button"
          :disabled="disabled"
          class="text-[15px] leading-none opacity-60 transition hover:opacity-100 disabled:opacity-30"
          :aria-label="`Retirer ${valeur}`"
          @click="retirer(valeur)"
        >
          ×
        </button>
      </li>
    </ul>

    <input
      :id="id"
      v-model="saisie"
      :disabled="disabled || plein"
      :placeholder="plein ? `Maximum de ${maximum ?? MAX_PAR_DEFAUT} atteint` : placeholder"
      :maxlength="LONGUEUR_MAX"
      class="w-full rounded-champ border border-ligne px-3.5 py-2.5 text-[14px]"
      @keydown.enter.prevent="ajouter"
      @keydown.,.prevent="ajouter"
      @keydown.backspace="reculer"
      @blur="ajouter"
    >
    <p class="mt-1.5 text-[12.5px] text-discret">
      Entrée ou virgule pour valider chaque nom.
    </p>
  </div>
</template>
