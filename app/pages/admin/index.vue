<script setup lang="ts">
import type { EntreeJournal } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Administration')

const mois = ref('')
const programme = ref('')

const { data } = await useFetch<{
  role: string
  inscriptions: number
  objectifInscriptions: number
  ca: number
  objectifCa: number
  margeBrute: number
  completionMoyenne: number
  certificatsGeneres: number
  topModules: { titre: string; programme: string; ventes: number }[]
  aTraiter: { coachingPrive: number; candidatures: number; sessionsAReprogrammer: number }
  prochainesSessions: {
    date: string
    thematique: string
    formateur: string
    inscrits: number
    places: number
  }[]
  dernieresTransactions: {
    reference: string
    apprenant: string
    module: string
    montant: number
    statut: string
    referenceFeexpay: string | null
  }[]
  journal: EntreeJournal[]
  comptesActifs: number
  moisDisponibles: string[]
}>('/api/admin/vue-ensemble', {
  query: { mois, programme },
})

const partObjectif = computed(() =>
  data.value ? Math.round((data.value.inscriptions / data.value.objectifInscriptions) * 100) : 0,
)

const nomDuMois = (valeur: string) =>
  new Date(`${valeur}-01T00:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

const pilule = 'rounded-full border border-ligne bg-white px-4 py-2.5 text-[13px] font-semibold focus:border-social focus:outline-none'
const carte = 'rounded-[14px] border border-ligne-douce bg-white p-[22px]'
const lien = 'text-[12.5px] font-bold'
</script>

<template>
  <div v-if="data">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-title text-[26px] font-light">Vue d’ensemble</h1>
      <div class="flex flex-wrap gap-2.5">
        <label>
          <span class="sr-only">Mois</span>
          <select v-model="mois" :class="pilule">
            <option value="">30 derniers jours</option>
            <option v-for="m in data.moisDisponibles" :key="m" :value="m">{{ nomDuMois(m) }}</option>
          </select>
        </label>
        <label>
          <span class="sr-only">Programme</span>
          <select v-model="programme" :class="pilule">
            <option value="">Tous programmes</option>
            <option value="social-media">Social Média</option>
            <option value="entrepreneurs">Entrepreneurs</option>
          </select>
        </label>
      </div>
    </div>

    <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <AdminCarteIndicateur
        taille="xl"
        libelle="Inscriptions payantes"
        :valeur="String(data.inscriptions)"
        :detail="`${partObjectif} % de l’objectif (${data.objectifInscriptions}/mois)`"
      />
      <AdminCarteIndicateur
        taille="xl"
        libelle="Chiffre d’affaires"
        :valeur="formatFcfa(data.ca)"
        :detail="`Objectif : ${formatFcfa(data.objectifCa)} / mois`"
      />
      <AdminCarteIndicateur
        taille="xl"
        libelle="Marge brute"
        :valeur="formatFcfa(data.margeBrute)"
        detail="CA − frais de paiement FeexPay"
      />
      <AdminCarteIndicateur
        taille="xl"
        libelle="Taux de complétion moyen"
        :valeur="`${data.completionMoyenne} %`"
        detail="Recalculé toutes les heures"
      />
      <AdminCarteIndicateur
        taille="xl"
        libelle="Certificats générées"
        :valeur="String(data.certificatsGeneres)"
        detail="Temps réel"
      />
    </div>

    <div class="mt-6 grid items-start gap-4 md:grid-cols-2 lg:grid-cols-[1.35fr_1fr]">
      <section :class="carte">
        <div class="mb-3.5 flex items-center justify-between gap-3">
          <b class="text-[15px]">Ventes par module — top 5</b>
          <NuxtLink to="/admin/performances" :class="lien">Tout voir</NuxtLink>
        </div>
        <!-- Libellé, barre et compte sur une même ligne, la barre teintée par
             le programme du module. -->
        <ul class="flex flex-col gap-2.5 text-[13.5px]">
          <li
            v-for="module in data.topModules"
            :key="module.titre"
            class="grid grid-cols-[1fr_90px_46px] items-center gap-3 sm:grid-cols-[1fr_120px_70px]"
          >
            <span class="min-w-0 truncate">{{ module.titre }}</span>
            <span class="h-[7px] rounded-full bg-piste">
              <span
                class="block h-full rounded-full"
                :class="module.programme === 'social-media' ? 'bg-social' : 'bg-entrepreneurs'"
                :style="{ width: `${(module.ventes / (data.topModules[0]?.ventes || 1)) * 100}%` }"
              />
            </span>
            <b class="text-right">{{ module.ventes }}</b>
          </li>
        </ul>
      </section>

      <!-- Deux cartes distinctes dans la maquette, pas une seule à deux titres. -->
      <div class="flex flex-col gap-4">
        <section :class="carte">
          <b class="text-[15px]">À traiter</b>
          <ul class="mt-3 flex flex-col gap-2.5 text-[13.5px]">
            <li class="flex items-center justify-between gap-3">
              <NuxtLink to="/admin/coaching-prive">Demandes de coaching privé</NuxtLink>
              <b class="text-social">{{ data.aTraiter.coachingPrive }} en attente</b>
            </li>
            <li class="flex items-center justify-between gap-3">
              <NuxtLink to="/admin/candidatures">Candidatures formateurs</NuxtLink>
              <b class="text-social">{{ data.aTraiter.candidatures }} nouvelles</b>
            </li>
            <li class="flex items-center justify-between gap-3">
              <NuxtLink to="/admin/sessions">Session à reprogrammer</NuxtLink>
              <b class="text-alerte">{{ data.aTraiter.sessionsAReprogrammer }}</b>
            </li>
          </ul>
        </section>

        <section :class="carte">
          <b class="text-[15px]">Prochaines sessions de coaching</b>
          <ul class="mt-3 flex flex-col gap-2.5 text-[13px] text-texte">
            <li
              v-for="session in data.prochainesSessions"
              :key="session.date + session.thematique"
              class="flex items-center justify-between gap-3"
            >
              <span class="min-w-0 flex-1 truncate">
                {{ formatDate(session.date) }} · {{ session.thematique }} — {{ session.formateur }}
              </span>
              <b class="shrink-0">{{ session.inscrits }} / {{ session.places }}</b>
            </li>
          </ul>
        </section>
      </div>
    </div>

    <div class="mt-4 grid items-start gap-4 md:grid-cols-2 lg:grid-cols-[1.35fr_1fr]">
      <section :class="carte">
        <div class="mb-3.5 flex items-center justify-between gap-3">
          <b class="text-[15px]">Dernières transactions</b>
          <NuxtLink to="/admin/transactions" :class="lien">Transactions &amp; paiements</NuxtLink>
        </div>
        <ul class="flex flex-col gap-2.5 text-[13px]">
          <li
            v-for="t in data.dernieresTransactions"
            :key="t.reference"
            class="grid grid-cols-[92px_1fr_70px] items-center gap-3 sm:grid-cols-[110px_1fr_90px_80px]"
          >
            <!-- Une référence anormalement longue ne doit pas faire enfler la
                 ligne : la colonne est fixe, le texte se coupe. -->
            <span class="truncate font-mono text-[12px]" :title="t.reference">{{ t.reference }}</span>
            <span class="min-w-0 truncate">{{ t.apprenant }} · {{ t.module }}</span>
            <b class="text-right">{{ formatFcfa(t.montant) }}</b>
            <span
              class="hidden rounded-full px-2 py-[3px] text-center text-[10.5px] font-bold sm:block"
              :class="t.statut === 'reussie' ? 'bg-succes-voile text-succes' : 'bg-erreur-voile text-erreur-fonce'"
            >
              {{ t.statut === 'reussie' ? 'Réussie' : 'Échouée' }}
            </span>
          </li>
        </ul>
        <!-- Les trois mesures d'audience sont le pied de cette carte dans la
             maquette. Elles viennent de Google Analytics, qui n'est pas relié :
             un tiret vaut mieux qu'un chiffre inventé. -->
        <div class="mt-3.5 flex flex-wrap gap-x-[22px] gap-y-1 border-t border-ligne-claire pt-3 text-[12.5px] text-discret">
          <span>Trafic du jour : <b class="text-encre">—</b></span>
          <span>Taux de conversion : <b class="text-encre">—</b></span>
          <span><b class="text-encre">—</b> % mobile</span>
        </div>
      </section>

      <section :class="carte">
        <div class="mb-3.5 flex items-center justify-between gap-3">
          <b class="text-[15px]">Activité récente</b>
          <NuxtLink to="/admin/historique" :class="lien">Historique &amp; versions</NuxtLink>
        </div>
        <ul class="flex flex-col gap-2.5 text-[13px] text-texte">
          <li v-for="entree in data.journal" :key="entree.id" class="flex justify-between gap-3">
            <span><b>{{ entree.auteur }}</b> {{ entree.action }} «&nbsp;{{ entree.cible }}&nbsp;»</span>
            <span class="shrink-0 whitespace-nowrap text-discret">{{ formatRelatif(entree.date) }}</span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
