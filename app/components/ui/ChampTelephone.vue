<script setup lang="ts">
import {
  PAYS_AUTRE,
  PAYS_TELEPHONE,
  formaterNational,
  paysDepuisLibelle,
  separerTelephone,
  trouverPaysTelephone,
  versE164,
} from '#shared/utils/telephone'

/**
 * Saisie d'un numéro WhatsApp : menu des pays à gauche, numéro national à
 * droite, découpé au fil de la frappe.
 *
 * Le composant émet du E.164 (`+2250709881234`), jamais la forme affichée.
 * `pays` n'est qu'une valeur de départ, pour un compte qui n'a pas encore de
 * numéro : dès qu'il y en a un, c'est son indicatif qui gouverne le menu —
 * sinon un apprenant ivoirien installé au Sénégal verrait son numéro
 * réattribué au mauvais pays à chaque affichage.
 */
const props = defineProps<{
  modelValue?: string | null
  /** Pays du compte, texte libre venu de l'inscription. */
  pays?: string | null
  disabled?: boolean
  id?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [valeur: string] }>()

const depart = separerTelephone(props.modelValue)
const codePays = ref(depart.national ? depart.pays : paysDepuisLibelle(props.pays))
const national = ref(formaterNational(depart.national, trouverPaysTelephone(depart.pays)))

const paysChoisi = computed(() => trouverPaysTelephone(codePays.value))
const prefixe = computed(() => (paysChoisi.value ? `+${paysChoisi.value.indicatif}` : '+'))
const exemple = computed(() => paysChoisi.value?.exemple ?? '227 123 456')

function publier() {
  emit('update:modelValue', versE164(paysChoisi.value, national.value))
}

function saisir(evenement: Event) {
  const entree = evenement.target as HTMLInputElement
  national.value = formaterNational(entree.value, paysChoisi.value)
  // Vue ne rafraîchirait pas l'élément si la valeur reformatée est identique à
  // celle déjà liée : on la repose à la main pour que les espaces s'insèrent.
  entree.value = national.value
  publier()
}

function changerPays() {
  national.value = formaterNational(national.value, paysChoisi.value)
  publier()
}

/**
 * Remise au format E.164 d'une valeur déjà enregistrée sous une autre forme —
 * les numéros d'origine portent des espaces (« +225 07 00 00 00 00 »), que le
 * contrôle serveur refuse. Sans cette normalisation à l'affichage, ouvrir la
 * fiche et l'enregistrer sans toucher au numéro renverrait une erreur sur un
 * champ que personne n'a modifié.
 */
onMounted(() => {
  const normalise = versE164(paysChoisi.value, national.value)
  if (normalise && normalise !== props.modelValue) emit('update:modelValue', normalise)
})

/**
 * Le champ suit la valeur quand elle change ailleurs (rechargement de la fiche
 * après enregistrement). On ne touche à rien tant que la valeur reçue décrit
 * déjà ce qui est affiché, sous peine de défaire la frappe en cours.
 */
watch(
  () => props.modelValue,
  (valeur) => {
    if (valeur === versE164(paysChoisi.value, national.value)) return
    const part = separerTelephone(valeur)
    codePays.value = part.national ? part.pays : paysDepuisLibelle(props.pays)
    national.value = formaterNational(part.national, trouverPaysTelephone(part.pays))
  },
)
</script>

<template>
  <div class="flex gap-2">
    <select
      v-model="codePays"
      :disabled="disabled"
      aria-label="Indicatif du pays"
      class="w-[132px] shrink-0 rounded-[10px] border border-ligne bg-white px-2.5 py-2.5 text-[14px] focus:border-social focus:outline-none disabled:bg-fond-clair disabled:text-texte"
      @change="changerPays"
    >
      <option v-for="p in PAYS_TELEPHONE" :key="p.code" :value="p.code">
        {{ p.nom }} +{{ p.indicatif }}
      </option>
      <option :value="PAYS_AUTRE">Autre pays</option>
    </select>
    <div class="relative min-w-0 flex-1">
      <span
        aria-hidden="true"
        class="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[15px] text-discret"
      >
        {{ prefixe }}
      </span>
      <input
        :id="id"
        type="tel"
        inputmode="numeric"
        autocomplete="tel-national"
        :value="national"
        :disabled="disabled"
        :placeholder="exemple"
        :style="{ paddingLeft: `${1 + prefixe.length * 0.55}rem` }"
        class="w-full rounded-[10px] border border-ligne py-2.5 pr-4 text-[15px] focus:border-social focus:outline-none disabled:bg-fond-clair disabled:text-texte"
        @input="saisir"
      >
    </div>
  </div>
</template>
