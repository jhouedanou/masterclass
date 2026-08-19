<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Revenus — administration')

const { data } = await useFetch<{
  reglages: { fraisPaiementPourcent: number; partBigFivePourcent: number; partFormateurPourcent: number }
  total: { ca: number; frais: number; marge: number; revenuBigFive: number; revenuFormateurs: number }
  parFormateur: { id: string; nom: string; ca: number; marge: number; remuneration: number }[]
}>('/api/admin/revenus')
</script>

<template>
  <div v-if="data">
    <h1 class="font-title text-[26px] font-light">Revenus</h1>

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
