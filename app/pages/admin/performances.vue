<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Performances — administration')

const { data } = await useFetch<{
  ca: number
  evolutionCa: number
  ventes: number
  modulesParAcheteur: number
  visites: number
  visiteursUniques: number
  tauxConversion: number
  repartitionProgramme: { socialMedia: number; entrepreneurs: number }
  topPays: string
  ltv: number
  appareils: { mobile: number; desktop: number }
  topSource: string
  directReferents: number
  pageLaPlusVue: string
  acheteurs: number
  nouveaux: number
  recurrents: number
  caQuotidien: number[]
}>('/api/admin/performances')

const max = computed(() => Math.max(...(data.value?.caQuotidien ?? [1])))
const onglet = ref<'resume' | 'ventes' | 'visites' | 'clients'>('resume')
</script>

<template>
  <div v-if="data">
    <h1 class="font-title text-[26px] font-light">Performances</h1>
    <p class="mt-2 text-[12.5px] text-discret">
      Collecte prévue via Google Tag Manager : Meta Pixel + API Conversions, GA4, TikTok Pixel,
      LinkedIn Insight — événements dédupliqués côté serveur. Intégration à brancher ; les chiffres
      affichés sont des valeurs de démonstration.
    </p>

    <div class="mt-5 flex flex-wrap gap-2 text-[13px] font-bold" role="tablist">
      <button
        v-for="o in [
          { valeur: 'resume', libelle: 'Résumé' },
          { valeur: 'ventes', libelle: 'Ventes' },
          { valeur: 'visites', libelle: 'Visites' },
          { valeur: 'clients', libelle: 'Clients' },
        ]"
        :key="o.valeur"
        role="tab"
        :aria-selected="onglet === o.valeur"
        class="rounded-full border px-4 py-2"
        :class="onglet === o.valeur ? 'border-social bg-social text-white' : 'border-ligne bg-white text-texte'"
        @click="onglet = o.valeur as typeof onglet"
      >
        {{ o.libelle }}
      </button>
    </div>

    <div class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AdminCarteIndicateur
        libelle="Chiffre d’affaires"
        :valeur="formatFcfa(data.ca)"
        :detail="`+${data.evolutionCa} % vs période précédente`"
      />
      <AdminCarteIndicateur
        libelle="Ventes (modules)"
        :valeur="String(data.ventes)"
        :detail="`${data.modulesParAcheteur.toString().replace('.', ',')} module / acheteur`"
      />
      <AdminCarteIndicateur
        libelle="Visites"
        :valeur="new Intl.NumberFormat('fr-FR').format(data.visites)"
        :detail="`${new Intl.NumberFormat('fr-FR').format(data.visiteursUniques)} visiteurs uniques`"
      />
      <AdminCarteIndicateur
        libelle="Taux de conversion"
        :valeur="`${data.tauxConversion.toString().replace('.', ',')} %`"
        detail="visite → paiement réussi"
      />
    </div>

    <section class="mt-6 rounded-[14px] border border-ligne-douce bg-white p-6">
      <h2 class="font-title text-[19px] font-light">Chiffre d’affaires quotidien</h2>
      <div class="mt-5 flex h-40 items-end gap-1.5" role="img" aria-label="Histogramme du chiffre d’affaires quotidien">
        <div
          v-for="(valeur, i) in data.caQuotidien"
          :key="i"
          class="flex-1 rounded-t-[3px] bg-social"
          :style="{ height: `${(valeur / max) * 100}%` }"
          :title="`${new Intl.NumberFormat('fr-FR').format(valeur)} FCFA`"
        />
      </div>
      <p class="mt-3 text-[12px] text-discret">
        Pic à {{ formatFcfa(max) }} — lancement d’un module.
      </p>
    </section>

    <div class="mt-6 grid gap-6 lg:grid-cols-3">
      <section class="rounded-[14px] border border-ligne-douce bg-white p-6">
        <h2 class="font-title text-[19px] font-light">Ventes</h2>
        <dl class="mt-4 space-y-2 text-[13.5px]">
          <div class="flex justify-between gap-3">
            <dt class="text-discret">Par programme</dt>
            <dd>SM {{ data.repartitionProgramme.socialMedia }} % · ENT {{ data.repartitionProgramme.entrepreneurs }} %</dd>
          </div>
          <div class="flex justify-between gap-3"><dt class="text-discret">Top pays</dt><dd>{{ data.topPays }}</dd></div>
          <div class="flex justify-between gap-3"><dt class="text-discret">Revenu / apprenant</dt><dd>{{ formatFcfa(data.ltv) }}</dd></div>
        </dl>
      </section>

      <section class="rounded-[14px] border border-ligne-douce bg-white p-6">
        <h2 class="font-title text-[19px] font-light">Visites</h2>
        <dl class="mt-4 space-y-2 text-[13.5px]">
          <div class="flex justify-between gap-3">
            <dt class="text-discret">Appareils</dt>
            <dd>Mobile {{ data.appareils.mobile }} % · Desktop {{ data.appareils.desktop }} %</dd>
          </div>
          <div class="flex justify-between gap-3"><dt class="text-discret">Top source</dt><dd>{{ data.topSource }}</dd></div>
          <div class="flex justify-between gap-3"><dt class="text-discret">Direct / référents</dt><dd>{{ data.directReferents }} %</dd></div>
          <div class="flex justify-between gap-3"><dt class="text-discret">Page la plus vue</dt><dd class="font-mono text-[12.5px]">{{ data.pageLaPlusVue }}</dd></div>
        </dl>
      </section>

      <section class="rounded-[14px] border border-ligne-douce bg-white p-6">
        <h2 class="font-title text-[19px] font-light">Clients</h2>
        <dl class="mt-4 space-y-2 text-[13.5px]">
          <div class="flex justify-between gap-3"><dt class="text-discret">Acheteurs total</dt><dd>{{ data.acheteurs }}</dd></div>
          <div class="flex justify-between gap-3"><dt class="text-discret">Nouveaux (période)</dt><dd>{{ data.nouveaux }}</dd></div>
          <div class="flex justify-between gap-3">
            <dt class="text-discret">Récurrents (2 modules +)</dt>
            <dd>{{ data.recurrents }} ({{ Math.round((data.recurrents / data.acheteurs) * 100) }} %)</dd>
          </div>
        </dl>
      </section>
    </div>

    <p class="mt-5 text-[12.5px] text-discret">
      Détail des échecs de paiement :
      <NuxtLink to="/admin/transactions" class="underline">Transactions</NuxtLink> (accès restreint).
    </p>
  </div>
</template>
