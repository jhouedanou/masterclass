<script setup lang="ts">
import type { CreneauCoaching, ProgrammeSlug } from '#shared/types'

/**
 * Nouvelle demande de coaching privé (planche B, écran 06) : questions
 * obligatoires, choix du formateur parmi ceux dont l'accès est activé,
 * créneaux proposés et durée.
 */
const props = defineProps<{
  formateurs: { id: string; nom: string; expertise: string; photo: string; tarifHeure: number }[]
  modules: { id: string; titre: string; formateurId: string; programme: ProgrammeSlug }[]
  formateurInitial?: string
  erreur?: string
  envoi?: boolean
}>()
const emit = defineEmits<{
  fermer: []
  envoyer: [
    {
      moduleId: string
      formateurId: string
      objectif: string
      difficulte: string
      disponibilites: string
      creneaux: CreneauCoaching[]
      heures: number
    },
  ]
}>()

const moduleId = ref(props.modules[0]?.id ?? '')
const formateurId = ref(
  props.formateurInitial && props.formateurs.some((f) => f.id === props.formateurInitial)
    ? props.formateurInitial
    : '',
)
const objectif = ref('')
const difficulte = ref('')
const disponibilites = ref('')
const heures = ref(1)
const creneaux = ref<CreneauCoaching[]>([{ date: '', debut: '18:00', fin: '19:00' }])

// Le formateur du module est proposé d'office quand il offre le coaching privé.
watch(
  moduleId,
  (id) => {
    if (formateurId.value) return
    const formateurModule = props.modules.find((m) => m.id === id)?.formateurId
    if (formateurModule && props.formateurs.some((f) => f.id === formateurModule)) {
      formateurId.value = formateurModule
    }
  },
  { immediate: true },
)

const aujourdHui = new Date().toISOString().slice(0, 10)
const formateur = computed(() => props.formateurs.find((f) => f.id === formateurId.value))
const montant = computed(() => (formateur.value?.tarifHeure ?? 0) * heures.value)

const valide = computed(
  () =>
    moduleId.value &&
    formateurId.value &&
    objectif.value.trim().length >= 20 &&
    difficulte.value.trim().length >= 20 &&
    creneaux.value.some((c) => c.date && c.debut && c.fin && c.fin > c.debut),
)

function ajouterCreneau() {
  if (creneaux.value.length < 3) creneaux.value.push({ date: '', debut: '18:00', fin: '19:00' })
}

function envoyer() {
  if (!valide.value) return
  emit('envoyer', {
    moduleId: moduleId.value,
    formateurId: formateurId.value,
    objectif: objectif.value.trim(),
    difficulte: difficulte.value.trim(),
    disponibilites: disponibilites.value.trim(),
    creneaux: creneaux.value.filter((c) => c.date && c.debut && c.fin),
    heures: heures.value,
  })
}
</script>

<template>
  <div class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-encre/50 p-4">
    <div class="my-6 w-full max-w-2xl rounded-carte bg-white p-6">
      <h2 class="font-title text-[21px] font-light">Demander un coaching privé</h2>
      <p class="mt-1 text-[13.5px] text-discret">
        Accompagnement individuel, 50 000 FCFA par heure. L’équipe confirme le créneau avec le
        formateur avant tout paiement.
      </p>

      <form class="mt-5 space-y-5" @submit.prevent="envoyer">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Module concerné *</span>
            <select v-model="moduleId" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
              <option v-for="m in modules" :key="m.id" :value="m.id">{{ m.titre }}</option>
            </select>
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Durée souhaitée *</span>
            <select v-model.number="heures" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
              <option v-for="h in 4" :key="h" :value="h">{{ h }} h — {{ formatFcfa((formateur?.tarifHeure ?? 50000) * h) }}</option>
            </select>
          </label>
        </div>

        <fieldset>
          <legend class="mb-2 text-[13px] font-bold text-texte">Formateur *</legend>
          <p v-if="!formateurs.length" class="text-[13.5px] text-discret">
            Aucun formateur ne propose de coaching privé pour le moment.
          </p>
          <div class="grid gap-2 sm:grid-cols-2">
            <label
              v-for="f in formateurs"
              :key="f.id"
              class="flex cursor-pointer items-center gap-3 rounded-[12px] border p-3"
              :class="formateurId === f.id ? 'border-social bg-social-voile' : 'border-ligne'"
            >
              <input v-model="formateurId" type="radio" name="formateur" :value="f.id" class="accent-social">
              <img :src="f.photo" alt="" class="size-10 rounded-full object-cover">
              <span>
                <span class="block text-[14px] font-bold text-encre">{{ f.nom }}</span>
                <span class="block text-[12px] text-discret">{{ f.expertise }}</span>
              </span>
            </label>
          </div>
        </fieldset>

        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">
            Quel objectif voulez-vous atteindre avec cette séance ? *
          </span>
          <textarea v-model="objectif" rows="3" required minlength="20" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]" />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">
            Sur quoi bloquez-vous aujourd’hui ? *
          </span>
          <textarea v-model="difficulte" rows="3" required minlength="20" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]" />
        </label>

        <fieldset>
          <legend class="mb-2 text-[13px] font-bold text-texte">Créneaux proposés * (3 au plus)</legend>
          <div v-for="(c, i) in creneaux" :key="i" class="mb-2 grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
            <input v-model="c.date" type="date" :min="aujourdHui" class="rounded-[10px] border border-ligne px-3 py-2 text-[14px]">
            <input v-model="c.debut" type="time" class="rounded-[10px] border border-ligne px-2 py-2 text-[14px]">
            <input v-model="c.fin" type="time" class="rounded-[10px] border border-ligne px-2 py-2 text-[14px]">
            <button
              type="button"
              class="text-[12px] text-discret underline disabled:opacity-40"
              :disabled="creneaux.length === 1"
              aria-label="Retirer ce créneau"
              @click="creneaux.splice(i, 1)"
            >
              Retirer
            </button>
          </div>
          <button v-if="creneaux.length < 3" type="button" class="text-[13px] text-social underline" @click="ajouterCreneau">
            + Ajouter un créneau
          </button>
        </fieldset>

        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Autres disponibilités (optionnel)</span>
          <input v-model="disponibilites" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]" placeholder="Soirs de semaine après 18 h, samedi matin…">
        </label>

        <p v-if="erreur" class="rounded-[10px] border border-erreur bg-[#fdeeee] p-3 text-[13.5px] text-erreur">{{ erreur }}</p>

        <div class="flex flex-wrap items-center gap-3">
          <UiBaseButton type="submit" taille="sm" :disabled="!valide || envoi">
            Envoyer ma demande — {{ formatFcfa(montant) }}
          </UiBaseButton>
          <UiBaseButton taille="sm" variante="contour" @click="emit('fermer')">Annuler</UiBaseButton>
        </div>
      </form>

      <p class="mt-4 text-[12px] text-discret">
        Aucun paiement n’est demandé maintenant : vous recevrez le lien de paiement une fois le
        créneau confirmé par l’équipe.
      </p>
    </div>
  </div>
</template>
