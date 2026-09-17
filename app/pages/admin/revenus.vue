<script setup lang="ts">
import type { ColonneCsv } from '~/utils/csv'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Revenus — administration')

const auth = useAuthStore()

const mois = ref('')
const programme = ref('')
const moduleId = ref('')
const session = ref('')
const coachingPrive = ref('')
const formateur = ref('')
const pays = ref('')

// Changer de programme rend le module ou la session choisis caducs.
watch(programme, () => {
  moduleId.value = ''
  session.value = ''
})

interface LigneFormateur {
  id: string
  nom: string
  ca: number
  caModules: number
  caPrive: number
  ventesModules: number
  heuresPrive: number
  marge: number
  remuneration: number
}

const { data, refresh } = await useFetch<{
  reglages: {
    fraisPaiementPourcent: number
    partBigFivePourcent: number
    partFormateurPourcent: number
    objectifInscriptionsMensuel: number
    objectifCaMensuel: number
  }
  total: { ca: number; frais: number; marge: number; revenuBigFive: number; revenuFormateurs: number }
  parFormateur: LigneFormateur[]
  parSource: { source: string; ca: number; frais: number; marge: number }[]
  moisDisponibles: string[]
  formateursDisponibles: { id: string; nom: string }[]
  modulesDisponibles: { id: string; titre: string }[]
  sessionsDisponibles: { id: string; libelle: string }[]
  paysDisponibles: (string | undefined)[]
}>('/api/admin/revenus', {
  query: computed(() => ({
    mois: mois.value || undefined,
    programme: programme.value || undefined,
    module: moduleId.value || undefined,
    session: session.value || undefined,
    coachingPrive: coachingPrive.value || undefined,
    formateur: formateur.value || undefined,
    pays: pays.value || undefined,
  })),
})

const nomDuMois = (valeur: string) =>
  new Date(`${valeur}-01T00:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

function exporter() {
  exporterCsv(
    `revenus-${mois.value || 'tout'}`,
    [
      { cle: 'nom', libelle: 'Formateur' },
      { cle: 'caModules', libelle: 'CA modules (FCFA)' },
      { cle: 'caPrive', libelle: 'CA coaching privé (FCFA)' },
      { cle: 'ca', libelle: 'CA total (FCFA)' },
      { cle: 'marge', libelle: 'Marge brute (FCFA)' },
      { cle: 'remuneration', libelle: 'Rémunération (FCFA)' },
    ] satisfies ColonneCsv<LigneFormateur>[],
    data.value?.parFormateur ?? [],
  )
}

// --- Répartition et frais ---------------------------------------------------
//
// Ces pourcentages commandent tout ce que l'écran affiche : les lire à côté du
// résultat évite d'avoir à s'en souvenir, et c'est la raison pour laquelle ils
// ont quitté l'écran Paramètres.

const reglagesOuverts = ref(false)
const brouillon = reactive({
  fraisPaiementPourcent: 0,
  partBigFivePourcent: 0,
  partFormateurPourcent: 0,
  objectifInscriptionsMensuel: 0,
  objectifCaMensuel: 0,
})
const message = ref('')
const erreur = ref('')

watchEffect(() => {
  if (data.value) Object.assign(brouillon, data.value.reglages)
})

async function enregistrerReglages() {
  erreur.value = ''
  message.value = ''
  try {
    await $fetch('/api/admin/parametres', { method: 'PUT', body: brouillon })
    message.value = 'Répartition enregistrée — modification journalisée.'
    reglagesOuverts.value = false
    await refresh()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Enregistrement impossible.'
  }
}

const optionsMois = computed(() => [
  { valeur: '', libelle: '🗓 Date : depuis le début' },
  ...(data.value?.moisDisponibles ?? []).map((m) => ({ valeur: m, libelle: `🗓 Date : ${nomDuMois(m)}` })),
])
const optionsProgramme = [
  { valeur: '', libelle: 'Programme' },
  { valeur: 'social-media', libelle: 'Social Média' },
  { valeur: 'entrepreneurs', libelle: 'Entrepreneurs' },
]
const optionsModule = computed(() => [
  { valeur: '', libelle: 'Module' },
  ...(data.value?.modulesDisponibles ?? []).map((m) => ({ valeur: m.id, libelle: m.titre })),
])
const optionsSession = computed(() => [
  { valeur: '', libelle: 'Coaching session' },
  ...(data.value?.sessionsDisponibles ?? []).map((x) => ({ valeur: x.id, libelle: x.libelle })),
])
const optionsCoachingPrive = [
  { valeur: '', libelle: 'Coaching privé' },
  { valeur: 'uniquement', libelle: 'Coaching privé uniquement' },
  { valeur: 'exclu', libelle: 'Sans le coaching privé' },
]
const optionsFormateur = computed(() => [
  { valeur: '', libelle: 'Formateur' },
  ...(data.value?.formateursDisponibles ?? []).map((f) => ({ valeur: f.id, libelle: f.nom })),
])
const optionsPays = computed(() => [
  { valeur: '', libelle: 'Pays' },
  ...(data.value?.paysDisponibles ?? []).filter(Boolean).map((x) => ({ valeur: x!, libelle: x! })),
])

const champ =
  'w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] focus:border-social focus:outline-none disabled:bg-fond-clair'
// Écarts de la maquette (écran 21) : carte de contenu à 22 px, titre de carte en
// Mulish gras 15 px, tableau interne encadré d'un filet clair.
const carte = 'rounded-[14px] border border-ligne-douce bg-white p-[22px]'
const titreCarte = 'font-sans text-[15px] font-bold'
const tableauInterne = 'mt-3.5 overflow-hidden rounded-[10px] border border-ligne-claire text-[12.5px]'
const enTeteInterne =
  'bg-fond-clair text-[10.5px] font-bold tracking-[0.06em] text-discret uppercase'
</script>

<template>
  <div v-if="data">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-title text-[24px] font-light">Revenus</h1>
      <UiBaseButton taille="sm" variante="contour" @click="exporter">⬇ Exporter en CSV</UiBaseButton>
    </div>

    <!-- Filtres combinables : la note de la maquette tient sur la même ligne. -->
    <div class="mt-4 flex flex-wrap items-center gap-2">
      <UiFiltrePilule v-model="mois" etiquette="Date" :options="optionsMois" />
      <UiFiltrePilule v-model="programme" etiquette="Programme" :options="optionsProgramme" />
      <UiFiltrePilule v-model="moduleId" etiquette="Module" :options="optionsModule" />
      <UiFiltrePilule v-model="session" etiquette="Coaching session" :options="optionsSession" />
      <UiFiltrePilule v-model="coachingPrive" etiquette="Coaching privé" :options="optionsCoachingPrive" />
      <UiFiltrePilule v-model="formateur" etiquette="Formateur" :options="optionsFormateur" />
      <UiFiltrePilule v-model="pays" etiquette="Pays" :options="optionsPays" />
      <span class="text-[11.5px] text-discret">
        Filtres combinables — tous les indicateurs se recalculent selon la sélection
      </span>
    </div>

    <p v-if="message" class="mt-4 rounded-[10px] border border-succes bg-succes-voile px-4 py-3 text-[14px] text-succes">{{ message }}</p>
    <p v-if="erreur" class="mt-4 rounded-[10px] border border-erreur bg-erreur-voile px-4 py-3 text-[14px] text-erreur">{{ erreur }}</p>

    <form
      v-if="reglagesOuverts && auth.estAdminSuperieur"
      class="mt-4 rounded-[14px] border-[1.5px] border-social bg-white p-[22px]"
      @submit.prevent="enregistrerReglages"
    >
      <h2 :class="titreCarte">Répartition et frais</h2>
      <p class="mt-1 text-[12.5px] text-discret">
        Ces pourcentages commandent tous les chiffres de cet écran. Réservé à l’administrateur
        principal, et journalisé.
      </p>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Frais de paiement FeexPay (%)</span>
          <input v-model.number="brouillon.fraisPaiementPourcent" type="number" min="0" max="20" :class="champ">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Part Big Five (%)</span>
          <input v-model.number="brouillon.partBigFivePourcent" type="number" min="0" max="100" :class="champ">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Part formateur (%)</span>
          <input v-model.number="brouillon.partFormateurPourcent" type="number" min="0" max="100" :class="champ">
          <span class="mt-1 block text-[12px] text-discret">Les deux parts doivent totaliser 100 %.</span>
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Objectif d’inscriptions / mois</span>
          <input v-model.number="brouillon.objectifInscriptionsMensuel" type="number" min="0" :class="champ">
        </label>
        <label class="block sm:col-span-2">
          <span class="mb-1.5 block text-[13px] font-bold">Objectif de CA / mois (FCFA)</span>
          <input v-model.number="brouillon.objectifCaMensuel" type="number" min="0" :class="champ">
        </label>
      </div>
      <div class="mt-4 flex gap-2">
        <UiBaseButton type="submit" taille="sm">Enregistrer</UiBaseButton>
        <UiBaseButton variante="contour" taille="sm" @click="reglagesOuverts = false">Fermer</UiBaseButton>
      </div>
    </form>

    <div class="mt-5 grid gap-[14px] sm:grid-cols-2 lg:grid-cols-5">
      <AdminCarteIndicateur
        libelle="Chiffre d’affaires"
        :valeur="formatNombre(data.total.ca)"
        unite="F"
        taille="sm"
        detail="modules + coaching privé"
      />
      <AdminCarteIndicateur
        libelle="Frais de paiement"
        :valeur="formatNombre(data.total.frais)"
        unite="F"
        taille="sm"
        :detail="`FeexPay — ${data.reglages.fraisPaiementPourcent} % du CA`"
      />
      <!-- La maquette accentue la marge brute : c'est elle qui commande les deux
           cartes suivantes. -->
      <AdminCarteIndicateur
        libelle="Marge brute"
        :valeur="formatNombre(data.total.marge)"
        unite="F"
        taille="sm"
        detail="CA − frais de paiement"
        accent
      />
      <AdminCarteIndicateur
        libelle="Revenu Big Five"
        :valeur="formatNombre(data.total.revenuBigFive)"
        unite="F"
        taille="sm"
        :detail="`marge brute × ${data.reglages.partBigFivePourcent} %`"
      />
      <AdminCarteIndicateur
        libelle="Revenu formateurs"
        :valeur="formatNombre(data.total.revenuFormateurs)"
        unite="F"
        taille="sm"
        :detail="`marge brute × ${data.reglages.partFormateurPourcent} %`"
      />
    </div>

    <div class="mt-5 grid items-start gap-4 lg:grid-cols-[1fr_1.15fr]">
      <section :class="carte">
        <h2 :class="titreCarte">Répartition par source de revenu</h2>
        <div :class="tableauInterne">
          <table class="w-full table-fixed text-left">
            <colgroup><col style="width:34%"><col style="width:26%"><col style="width:20%"><col style="width:20%"></colgroup>
            <thead :class="enTeteInterne">
              <tr class="border-b border-ligne-claire">
                <th class="px-3.5 py-2.5">Source</th><th class="px-3.5 py-2.5">CA</th>
                <th class="px-3.5 py-2.5">Frais</th><th class="px-3.5 py-2.5">Marge brute</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in data.parSource" :key="l.source" class="border-b border-fond-voile">
                <td class="px-3.5 py-3"><b>{{ l.source }}</b></td>
                <td class="px-3.5 py-3">{{ formatFranc(l.ca) }}</td>
                <td class="px-3.5 py-3">{{ formatFranc(l.frais) }}</td>
                <td class="px-3.5 py-3 font-bold">{{ formatFranc(l.marge) }}</td>
              </tr>
              <tr class="bg-social-nuage">
                <td class="px-3.5 py-3"><b>Total</b></td>
                <td class="px-3.5 py-3 font-bold">{{ formatFranc(data.total.ca) }}</td>
                <td class="px-3.5 py-3 font-bold">{{ formatFranc(data.total.frais) }}</td>
                <td class="px-3.5 py-3 font-bold text-social">{{ formatFranc(data.total.marge) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="mt-3.5 rounded-[10px] border border-ligne-claire bg-fond-clair px-[15px] py-3 text-[12px] leading-relaxed text-discret">
          Les sessions de coaching collectives sont incluses dans le prix des modules — leur revenu
          est porté par la ligne Modules. Pourcentages Big Five / formateur :
          <b class="text-encre">{{ data.reglages.partBigFivePourcent }} % / {{ data.reglages.partFormateurPourcent }} %</b>,
          <!-- La maquette ne montre pas de bouton de réglage : c'est la mention
               elle-même qui ouvre le formulaire, pour l'admin principal seul. -->
          <button
            v-if="auth.estAdminSuperieur"
            class="text-inherit hover:underline"
            @click="reglagesOuverts = !reglagesOuverts"
          >paramétrables par l’admin principal</button>
          <template v-else>paramétrables par l’admin principal</template>
          (modification journalisée).
        </p>
      </section>

      <section :class="carte">
        <h2 :class="titreCarte">
          Rémunération par formateur — marge brute de ses ventes × {{ data.reglages.partFormateurPourcent }} %
        </h2>
        <div :class="tableauInterne">
          <table class="w-full table-fixed text-left">
            <colgroup><col style="width:34%"><col style="width:22%"><col style="width:22%"><col style="width:22%"></colgroup>
            <thead :class="enTeteInterne">
              <tr class="border-b border-ligne-claire">
                <th class="px-3.5 py-2.5">Formateur</th><th class="px-3.5 py-2.5">CA généré</th>
                <th class="px-3.5 py-2.5">Marge brute</th><th class="px-3.5 py-2.5">Rémunération</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in data.parFormateur" :key="f.id" class="border-b border-fond-voile">
                <td class="px-3.5 py-3">
                  <b>{{ f.nom }}</b>
                  <span v-if="f.caPrive > 0" class="ml-1 text-[10.5px] font-bold text-social">+ privé</span>
                </td>
                <td class="px-3.5 py-3">{{ formatFranc(f.ca) }}</td>
                <td class="px-3.5 py-3">{{ formatFranc(f.marge) }}</td>
                <td class="px-3.5 py-3 font-bold">{{ formatFranc(f.remuneration) }}</td>
              </tr>
              <tr class="bg-social-nuage">
                <td class="px-3.5 py-3"><b>Total</b></td>
                <td class="px-3.5 py-3 font-bold">{{ formatFranc(data.total.ca) }}</td>
                <td class="px-3.5 py-3 font-bold">{{ formatFranc(data.total.marge) }}</td>
                <td class="px-3.5 py-3 font-bold text-social">{{ formatFranc(data.total.revenuFormateurs) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="mt-3 text-[12px] leading-relaxed text-discret">
          Chaque formateur retrouve exactement ces chiffres — limités aux siens — dans l’onglet
          Revenus de son dashboard.
        </p>
      </section>
    </div>
  </div>
</template>
