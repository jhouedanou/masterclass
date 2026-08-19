<script setup lang="ts">
definePageMeta({ layout: 'formateur', middleware: 'formateur' })
usePagePrivee('Mes revenus — formateur')

const { data } = await useFetch<{
  lignes: { libelle: string; ventes: number; ca: number; marge: number; part: number }[]
  total: { ca: number; frais: number; marge: number; remuneration: number; margePlateforme: number }
}>('/api/formateur/revenus')
</script>

<template>
  <div v-if="data">
    <h1 class="font-title text-[26px] font-light">Mes revenus</h1>

    <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <p class="text-[13px] text-discret">CA généré</p>
        <p class="mt-1 font-title text-[26px] font-light">{{ formatFcfa(data.total.ca) }}</p>
        <p class="mt-1 text-[12px] text-discret">vos modules + coaching privé</p>
      </div>
      <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <p class="text-[13px] text-discret">Frais de paiement</p>
        <p class="mt-1 font-title text-[26px] font-light">{{ formatFcfa(data.total.frais) }}</p>
        <p class="mt-1 text-[12px] text-discret">FeexPay — 4 %</p>
      </div>
      <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <p class="text-[13px] text-discret">Marge brute</p>
        <p class="mt-1 font-title text-[26px] font-light">{{ formatFcfa(data.total.marge) }}</p>
        <p class="mt-1 text-[12px] text-discret">CA − frais de paiement</p>
      </div>
      <div class="rounded-[14px] border border-social bg-social-voile p-5">
        <p class="text-[13px] text-social">Votre rémunération</p>
        <p class="mt-1 font-title text-[26px] font-light">{{ formatFcfa(data.total.remuneration) }}</p>
        <p class="mt-1 text-[12px] text-discret">marge brute × 30 %</p>
      </div>
      <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
        <p class="text-[13px] text-discret">Marge brute Big Five</p>
        <p class="mt-1 font-title text-[26px] font-light">{{ formatFcfa(data.total.margePlateforme) }}</p>
        <p class="mt-1 text-[12px] text-discret">marge brute × 70 %</p>
      </div>
    </div>

    <AdminTableauSimple
      class="mt-6"
      :colonnes="['Source', 'Ventes', 'CA', 'Marge brute', 'Votre part (30 %)']"
    >
      <tr v-for="ligne in data.lignes" :key="ligne.libelle">
        <td class="px-4 py-3 font-bold">{{ ligne.libelle }}</td>
        <td class="px-4 py-3">{{ ligne.ventes }}</td>
        <td class="px-4 py-3">{{ formatFcfa(ligne.ca) }}</td>
        <td class="px-4 py-3">{{ formatFcfa(ligne.marge) }}</td>
        <td class="px-4 py-3">{{ formatFcfa(ligne.part) }}</td>
      </tr>
      <tr class="bg-fond-clair font-bold">
        <td class="px-4 py-3">Total</td>
        <td class="px-4 py-3" />
        <td class="px-4 py-3">{{ formatFcfa(data.total.ca) }}</td>
        <td class="px-4 py-3">{{ formatFcfa(data.total.marge) }}</td>
        <td class="px-4 py-3">{{ formatFcfa(data.total.remuneration) }}</td>
      </tr>
    </AdminTableauSimple>

    <p class="mt-4 text-[12.5px] text-discret">
      Répartition de la marge brute : 70 % Big Five · 30 % formateur. Versement mensuel par
      l’équipe — le relevé PDF reste à brancher.
    </p>
  </div>
</template>
