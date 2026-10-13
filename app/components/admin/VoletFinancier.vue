<script setup lang="ts">
/**
 * Paramètres financiers : frais de paiement FeexPay, répartition Big Five /
 * formateur et objectifs mensuels.
 *
 * Ces réglages vivaient dans un formulaire de /admin/revenus qu'ouvrait une
 * phrase cliquable : la recette ne les a pas trouvés (ACH-12, ADM-26). Ils
 * forment désormais un volet de Paramètres, repris tel quel sur l'écran
 * Revenus. Lecture pour tout administrateur, écriture réservée à
 * l'administrateur supérieur — `PUT /api/admin/parametres` le vérifie aussi.
 *
 * Pas d'`await` de haut niveau : le volet est monté par un `v-if` sur l'écran
 * Revenus, hors de toute frontière `Suspense`.
 */
const emit = defineEmits<{ enregistre: [] }>()

interface Reglages {
  fraisPaiementPourcent: number
  partBigFivePourcent: number
  partFormateurPourcent: number
  objectifInscriptionsMensuel: number
  objectifCaMensuel: number
}

const auth = useAuthStore()
const { annoncer } = useToasts()

const { data, refresh } = useFetch<{ financiers: Reglages }>('/api/admin/parametres', {
  key: 'parametres-financiers',
})

const brouillon = reactive<Reglages>({
  fraisPaiementPourcent: 0,
  partBigFivePourcent: 0,
  partFormateurPourcent: 0,
  objectifInscriptionsMensuel: 0,
  objectifCaMensuel: 0,
})
watchEffect(() => {
  if (data.value) Object.assign(brouillon, data.value.financiers)
})

const lectureSeule = computed(() => !auth.estAdminSuperieur)
const message = ref('')
const erreur = ref('')
const enCours = ref(false)

async function enregistrer() {
  message.value = ''
  erreur.value = ''
  enCours.value = true
  try {
    await $fetch('/api/admin/parametres', { method: 'PUT', body: brouillon })
    message.value = 'Paramètres financiers enregistrés — modification journalisée.'
    annoncer(message.value)
    await refresh()
    emit('enregistre')
  } catch (e) {
    const r = e as { statusMessage?: string; data?: { statusMessage?: string } }
    erreur.value = r.data?.statusMessage ?? r.statusMessage ?? 'Enregistrement impossible.'
  } finally {
    enCours.value = false
  }
}

const champ =
  'w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] focus:border-social focus:outline-none disabled:cursor-not-allowed disabled:bg-fond-clair disabled:text-discret'
const etiquette = 'mb-1.5 block text-[13px] font-bold'
</script>

<template>
  <form class="rounded-[14px] border-[1.5px] border-social bg-white p-[22px]" @submit.prevent="enregistrer">
    <h2 class="font-sans text-[15px] font-bold">Paramètres financiers</h2>
    <p class="mt-1 text-[12.5px] text-discret">
      Ces pourcentages commandent les chiffres de l’écran Revenus et la rémunération des formateurs
      (CA − frais de paiement, puis répartition).
      <template v-if="lectureSeule">
        Consultation seule : seul l’administrateur principal peut les modifier.
      </template>
      <template v-else>Toute modification est journalisée.</template>
    </p>

    <p v-if="!data" class="mt-4 text-[13.5px] text-discret">Chargement…</p>
    <fieldset v-else :disabled="lectureSeule" class="mt-4 grid gap-4 sm:grid-cols-2">
      <label class="block">
        <span :class="etiquette">Frais de paiement FeexPay (%)</span>
        <input v-model.number="brouillon.fraisPaiementPourcent" type="number" min="0" max="20" step="0.1" :class="champ">
      </label>
      <span class="hidden sm:block" />
      <label class="block">
        <span :class="etiquette">Part Big Five (%)</span>
        <input v-model.number="brouillon.partBigFivePourcent" type="number" min="0" max="100" :class="champ">
      </label>
      <label class="block">
        <span :class="etiquette">Part formateur (%)</span>
        <input v-model.number="brouillon.partFormateurPourcent" type="number" min="0" max="100" :class="champ">
        <span class="mt-1 block text-[12px] text-discret">Les deux parts doivent totaliser 100 %.</span>
      </label>
      <label class="block">
        <span :class="etiquette">Objectif d’inscriptions / mois</span>
        <input v-model.number="brouillon.objectifInscriptionsMensuel" type="number" min="0" :class="champ">
      </label>
      <label class="block">
        <span :class="etiquette">Objectif de CA / mois (FCFA)</span>
        <input v-model.number="brouillon.objectifCaMensuel" type="number" min="0" :class="champ">
      </label>
    </fieldset>

    <p v-if="message" role="status" class="mt-4 text-[13.5px] text-succes">{{ message }}</p>
    <p v-if="erreur" role="alert" class="mt-4 text-[13.5px] text-erreur">{{ erreur }}</p>

    <div v-if="!lectureSeule && data" class="mt-4 flex flex-wrap gap-2">
      <UiBaseButton type="submit" taille="sm" :disabled="enCours">
        {{ enCours ? 'Enregistrement…' : 'Enregistrer' }}
      </UiBaseButton>
      <slot name="actions" />
    </div>
    <div v-else-if="$slots.actions" class="mt-4 flex flex-wrap gap-2">
      <slot name="actions" />
    </div>
  </form>
</template>
