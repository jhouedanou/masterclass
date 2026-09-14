<script setup lang="ts">
definePageMeta({ layout: 'formateur', middleware: 'formateur' })
usePagePrivee('Mes revenus — formateur')

/** Filtres d'en-tête (planche D, écran 06) : période et module. */
const mois = ref(new Date().toISOString().slice(0, 7))
const moduleChoisi = ref('')

const { data } = await useFetch<{
  lignes: { libelle: string; ventes: number; ca: number; marge: number; part: number }[]
  total: { ca: number; frais: number; marge: number; remuneration: number; margePlateforme: number }
}>('/api/formateur/revenus', { query: { mois, module: moduleChoisi } })

const { data: mesModules } = await useFetch<{ id: string; titre: string }[]>(
  '/api/formateur/modules',
  { key: 'formateur-modules-liste' },
)

const optionsMois = computed(() =>
  Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setUTCDate(1)
    d.setUTCMonth(d.getUTCMonth() - i)
    const valeur = d.toISOString().slice(0, 7)
    return { valeur, libelle: formatMois(valeur) }
  }),
)

const optionsModules = computed(() => [
  { valeur: '', libelle: 'tous' },
  ...(mesModules.value ?? []).map((m) => ({ valeur: m.id, libelle: m.titre })),
])

/** Les parts sont paramétrées côté administration : les libellés de colonnes
 *  suivent le taux réellement appliqué plutôt qu'un 30 % figé. */
const partFormateur = computed(() => {
  const { marge, remuneration } = data.value?.total ?? { marge: 0, remuneration: 0 }
  return marge ? Math.round((remuneration / marge) * 100) : 30
})
const partPlateforme = computed(() => 100 - partFormateur.value)
</script>

<template>
  <div v-if="data">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-title text-[26px] font-light">Mes revenus</h1>
      <div class="flex flex-wrap gap-2.5">
        <FormateurFiltrePilule
          v-model="mois"
          etiquette="Période"
          prefixe="🗓 Période :"
          :options="optionsMois"
        />
        <FormateurFiltrePilule
          v-model="moduleChoisi"
          etiquette="Module"
          prefixe="Module :"
          :options="optionsModules"
        />
      </div>
    </div>

    <!-- Carte de tête du mobile (planche D, écran 07) : la rémunération
         d'abord, le détail ensuite. -->
    <div class="mt-6 rounded-[14px] border-2 border-social bg-white p-5 lg:hidden">
      <p class="surtitre text-social">Votre rémunération</p>
      <p class="mt-1 font-title text-[30px] font-light">{{ formatFcfa(data.total.remuneration) }}</p>
      <p class="mt-1 text-[11.5px] text-discret">
        marge brute {{ formatFcfa(data.total.marge) }} × {{ partFormateur }} %
      </p>
    </div>

    <div class="mt-4 grid gap-3.5 sm:grid-cols-2 lg:mt-6 lg:grid-cols-3 xl:grid-cols-5">
      <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <p class="text-[12px] text-discret">CA généré</p>
        <p class="mt-1 font-title text-[22px] font-light">{{ formatFcfa(data.total.ca) }}</p>
        <p class="mt-1 text-[11px] text-discret">vos modules + coaching privé</p>
      </div>
      <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <p class="text-[12px] text-discret">Frais de paiement</p>
        <p class="mt-1 font-title text-[22px] font-light">{{ formatFcfa(data.total.frais) }}</p>
        <p class="mt-1 text-[11px] text-discret">FeexPay</p>
      </div>
      <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <p class="text-[12px] text-discret">Marge brute</p>
        <p class="mt-1 font-title text-[22px] font-light">{{ formatFcfa(data.total.marge) }}</p>
        <p class="mt-1 text-[11px] text-discret">CA − frais de paiement</p>
      </div>
      <div class="hidden rounded-[14px] border-2 border-social bg-white p-5 lg:block">
        <p class="text-[12px] font-bold text-social">Votre rémunération</p>
        <p class="mt-1 font-title text-[22px] font-light">{{ formatFcfa(data.total.remuneration) }}</p>
        <p class="mt-1 text-[11px] text-discret">marge brute × {{ partFormateur }} %</p>
      </div>
      <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <p class="text-[12px] text-discret">Marge brute Big Five</p>
        <p class="mt-1 font-title text-[22px] font-light">{{ formatFcfa(data.total.margePlateforme) }}</p>
        <p class="mt-1 text-[11px] text-discret">marge brute × {{ partPlateforme }} %</p>
      </div>
    </div>

    <AdminTableauSimple
      class="mt-5"
      :colonnes="['Source', 'Ventes', 'CA', 'Marge brute', `Votre part (${partFormateur} %)`]"
    >
      <tr v-for="ligne in data.lignes" :key="ligne.libelle">
        <td class="px-4 py-3 font-bold">{{ ligne.libelle }}</td>
        <td class="px-4 py-3">{{ ligne.ventes }}</td>
        <td class="px-4 py-3">{{ formatFcfa(ligne.ca) }}</td>
        <td class="px-4 py-3">{{ formatFcfa(ligne.marge) }}</td>
        <td class="px-4 py-3 font-bold">{{ formatFcfa(ligne.part) }}</td>
      </tr>
      <tr class="bg-social-voile font-bold">
        <td class="px-4 py-3">Total</td>
        <td class="px-4 py-3" />
        <td class="px-4 py-3">{{ formatFcfa(data.total.ca) }}</td>
        <td class="px-4 py-3">{{ formatFcfa(data.total.marge) }}</td>
        <td class="px-4 py-3 text-social">{{ formatFcfa(data.total.remuneration) }}</td>
      </tr>
    </AdminTableauSimple>
    <p v-if="!data.lignes.length" class="mt-3 text-[13.5px] text-discret">
      Aucune vente sur la période retenue.
    </p>

    <div class="mt-5 flex flex-wrap items-center gap-3">
      <UiBaseButton variante="contour" taille="sm" :to="`/formateur/releve/${mois}?telecharger=1`">
        Télécharger le relevé PDF
      </UiBaseButton>
      <p class="text-[12px] leading-relaxed text-discret">
        Répartition de la marge brute : {{ partPlateforme }} % Big Five · {{ partFormateur }} %
        formateur (pourcentages fixés par contrat, paramétrés côté admin). Versement mensuel par
        l’équipe.
      </p>
    </div>
  </div>
</template>
