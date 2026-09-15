<script setup lang="ts">
import type { ColonneCsv } from '~/utils/csv'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Revenus — administration')

const auth = useAuthStore()

const mois = ref('')
const programme = ref('')
const formateur = ref('')

interface LigneFormateur {
  id: string
  nom: string
  ca: number
  caModules: number
  caPrive: number
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
  parSource: { source: string; ca: number; detail: string }[]
  moisDisponibles: string[]
  formateursDisponibles: { id: string; nom: string }[]
}>('/api/admin/revenus', {
  query: computed(() => ({
    mois: mois.value || undefined,
    programme: programme.value || undefined,
    formateur: formateur.value || undefined,
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

const champ =
  'w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] focus:border-social focus:outline-none disabled:bg-fond-clair'
</script>

<template>
  <div v-if="data">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <h1 class="font-title text-[26px] font-light">Revenus</h1>
      <div class="flex flex-wrap gap-2">
        <UiBaseButton taille="sm" variante="contour" @click="exporter">Exporter en CSV</UiBaseButton>
        <UiBaseButton
          v-if="auth.estAdminSuperieur"
          taille="sm"
          variante="contour"
          @click="reglagesOuverts = !reglagesOuverts"
        >
          {{ reglagesOuverts ? 'Fermer' : 'Répartition et frais' }}
        </UiBaseButton>
      </div>
    </div>

    <div class="mt-4 flex flex-wrap gap-2 text-[13px]">
      <select v-model="mois" class="rounded-full border border-ligne bg-white px-3.5 py-2">
        <option value="">Depuis le début</option>
        <option v-for="m in data.moisDisponibles" :key="m" :value="m">{{ nomDuMois(m) }}</option>
      </select>
      <select v-model="programme" class="rounded-full border border-ligne bg-white px-3.5 py-2">
        <option value="">Tous programmes</option>
        <option value="social-media">Social Média</option>
        <option value="entrepreneurs">Entrepreneurs</option>
      </select>
      <select v-model="formateur" class="rounded-full border border-ligne bg-white px-3.5 py-2">
        <option value="">Tous formateurs</option>
        <option v-for="f in data.formateursDisponibles" :key="f.id" :value="f.id">{{ f.nom }}</option>
      </select>
    </div>

    <p v-if="message" class="mt-4 rounded-[10px] border border-succes bg-succes-voile px-4 py-3 text-[14px] text-succes">{{ message }}</p>
    <p v-if="erreur" class="mt-4 rounded-[10px] border border-erreur bg-[#fdeeee] px-4 py-3 text-[14px] text-erreur">{{ erreur }}</p>

    <form
      v-if="reglagesOuverts && auth.estAdminSuperieur"
      class="mt-4 rounded-[14px] border border-social bg-white p-6"
      @submit.prevent="enregistrerReglages"
    >
      <h2 class="font-title text-[19px] font-light">Répartition et frais</h2>
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
      <UiBaseButton type="submit" taille="sm" class="mt-4">Enregistrer</UiBaseButton>
    </form>

    <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <AdminCarteIndicateur
        libelle="Chiffre d’affaires"
        :valeur="formatFcfa(data.total.ca)"
        detail="modules + coaching privé"
      />
      <AdminCarteIndicateur
        libelle="Frais de paiement"
        :valeur="formatFcfa(data.total.frais)"
        :detail="`FeexPay — ${data.reglages.fraisPaiementPourcent} % du CA`"
      />
      <AdminCarteIndicateur
        libelle="Marge brute"
        :valeur="formatFcfa(data.total.marge)"
        detail="CA − frais de paiement"
      />
      <AdminCarteIndicateur
        libelle="Revenu Big Five"
        :valeur="formatFcfa(data.total.revenuBigFive)"
        :detail="`marge brute × ${data.reglages.partBigFivePourcent} %`"
        accent
      />
      <AdminCarteIndicateur
        libelle="Revenu formateurs"
        :valeur="formatFcfa(data.total.revenuFormateurs)"
        :detail="`marge brute × ${data.reglages.partFormateurPourcent} %`"
      />
    </div>

    <h2 class="mt-8 font-title text-[19px] font-light">Revenus par source</h2>
    <AdminTableauSimple class="mt-3" :colonnes="['Source', 'Chiffre d’affaires', 'Part']">
      <tr v-for="l in data.parSource" :key="l.source">
        <td class="px-4 py-3 font-bold">
          {{ l.source }}
          <span class="block text-[12px] font-normal text-discret">{{ l.detail }}</span>
        </td>
        <td class="px-4 py-3">{{ formatFcfa(l.ca) }}</td>
        <td class="px-4 py-3 text-discret">
          {{ data.total.ca ? Math.round((l.ca / data.total.ca) * 100) : 0 }} %
        </td>
      </tr>
    </AdminTableauSimple>

    <h2 class="mt-8 font-title text-[19px] font-light">
      Rémunération par formateur — marge brute de ses ventes × {{ data.reglages.partFormateurPourcent }} %
    </h2>
    <AdminTableauSimple class="mt-3" :colonnes="['Formateur', 'CA généré', 'Marge brute', 'Rémunération']">
      <tr v-for="f in data.parFormateur" :key="f.id">
        <td class="px-4 py-3 font-bold">{{ f.nom }}</td>
        <td class="px-4 py-3">{{ formatFcfa(f.ca) }}</td>
        <td class="px-4 py-3">{{ formatFcfa(f.marge) }}</td>
        <td class="px-4 py-3">{{ formatFcfa(f.remuneration) }}</td>
      </tr>
      <tr class="bg-fond-clair font-bold">
        <td class="px-4 py-3">Total</td>
        <td class="px-4 py-3">{{ formatFcfa(data.total.ca) }}</td>
        <td class="px-4 py-3">{{ formatFcfa(data.total.marge) }}</td>
        <td class="px-4 py-3">{{ formatFcfa(data.total.revenuFormateurs) }}</td>
      </tr>
    </AdminTableauSimple>

    <p class="mt-4 text-[12.5px] text-discret">
      Les sessions de coaching collectif sont incluses dans le prix des modules : leur revenu est
      porté par la ligne Modules. Chaque formateur retrouve exactement ces chiffres — limités aux
      siens — dans l’onglet Revenus de son espace.
    </p>
  </div>
</template>
