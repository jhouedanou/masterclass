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
  topModules: { titre: string; ventes: number }[]
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
</script>

<template>
  <div v-if="data">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-title text-[26px] font-light">Vue d’ensemble</h1>
      <div class="flex flex-wrap gap-2">
        <label>
          <span class="sr-only">Mois</span>
          <select v-model="mois" class="rounded-[10px] border border-ligne bg-white px-3 py-2 text-[13.5px] focus:border-social focus:outline-none">
            <option value="">30 derniers jours</option>
            <option v-for="m in data.moisDisponibles" :key="m" :value="m">{{ nomDuMois(m) }}</option>
          </select>
        </label>
        <label>
          <span class="sr-only">Programme</span>
          <select v-model="programme" class="rounded-[10px] border border-ligne bg-white px-3 py-2 text-[13.5px] focus:border-social focus:outline-none">
            <option value="">Tous programmes</option>
            <option value="social-media">Social Média</option>
            <option value="entrepreneurs">Entrepreneurs</option>
          </select>
        </label>
      </div>
    </div>

    <!-- Trafic du jour : les six mesures d'audience viennent de Google
         Analytics, qui n'est pas encore relié. Un tiret vaut mieux qu'un
         chiffre inventé. -->
    <div class="mt-4 flex flex-wrap items-center gap-x-8 gap-y-2 rounded-[12px] border border-ligne-claire bg-white px-5 py-3 text-[13px]">
      <p class="font-bold text-encre">Trafic du jour</p>
      <p class="text-discret">Visiteurs <span class="font-bold text-encre">—</span></p>
      <p class="text-discret">Taux de conversion : <span class="font-bold text-encre">—</span></p>
      <p class="text-discret"><span class="font-bold text-encre">—</span> % mobile</p>
      <NuxtLink to="/admin/tracking" class="text-social underline">
        Reliez Google Analytics pour renseigner ces mesures →
      </NuxtLink>
    </div>

    <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <AdminCarteIndicateur
        libelle="Inscriptions payantes"
        :valeur="String(data.inscriptions)"
        :detail="`${partObjectif} % de l’objectif (${data.objectifInscriptions}/mois)`"
      />
      <AdminCarteIndicateur
        libelle="Chiffre d’affaires"
        :valeur="formatFcfa(data.ca)"
        :detail="`Objectif : ${formatFcfa(data.objectifCa)} / mois`"
      />
      <AdminCarteIndicateur
        libelle="Marge brute"
        :valeur="formatFcfa(data.margeBrute)"
        detail="CA − frais de paiement FeexPay"
      />
      <AdminCarteIndicateur
        libelle="Taux de complétion moyen"
        :valeur="`${data.completionMoyenne} %`"
        detail="Recalculé toutes les heures"
      />
      <AdminCarteIndicateur
        libelle="Certificats générées"
        :valeur="String(data.certificatsGeneres)"
        detail="Temps réel"
      />
    </div>

    <div class="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr]">
      <section class="rounded-[14px] border border-ligne-douce bg-white p-6">
        <div class="flex items-center justify-between">
          <h2 class="font-title text-[19px] font-light">Ventes par module — top 5</h2>
          <NuxtLink to="/admin/performances" class="text-[13px] underline">Tout voir</NuxtLink>
        </div>
        <ul class="mt-4 space-y-3">
          <li v-for="module in data.topModules" :key="module.titre">
            <div class="flex items-center justify-between gap-4 text-[14px]">
              <span class="min-w-0 flex-1 truncate">{{ module.titre }}</span>
              <span class="font-bold">{{ module.ventes }}</span>
            </div>
            <div class="mt-1.5 h-1.5 w-full rounded-full bg-fond-voile">
              <div
                class="h-full rounded-full bg-social"
                :style="{ width: `${(module.ventes / (data.topModules[0]?.ventes || 1)) * 100}%` }"
              />
            </div>
          </li>
        </ul>
      </section>

      <section class="rounded-[14px] border border-ligne-douce bg-white p-6">
        <h2 class="font-title text-[19px] font-light">À traiter</h2>
        <ul class="mt-4 space-y-2 text-[14px]">
          <li class="flex items-center justify-between">
            <NuxtLink to="/admin/coaching-prive" class="text-encre hover:underline">
              Demandes de coaching privé
            </NuxtLink>
            <span class="rounded-full bg-alerte-voile px-2.5 py-1 text-[12px] font-bold text-alerte">
              {{ data.aTraiter.coachingPrive }} en attente
            </span>
          </li>
          <li class="flex items-center justify-between">
            <NuxtLink to="/admin/formateurs" class="text-encre hover:underline">
              Candidatures formateurs
            </NuxtLink>
            <span class="rounded-full bg-alerte-voile px-2.5 py-1 text-[12px] font-bold text-alerte">
              {{ data.aTraiter.candidatures }} nouvelles
            </span>
          </li>
          <li class="flex items-center justify-between">
            <NuxtLink to="/admin/sessions" class="text-encre hover:underline">
              Session à reprogrammer
            </NuxtLink>
            <span class="rounded-full bg-fond-voile px-2.5 py-1 text-[12px] font-bold text-discret">
              {{ data.aTraiter.sessionsAReprogrammer }}
            </span>
          </li>
        </ul>

        <h2 class="mt-6 font-title text-[19px] font-light">Prochaines sessions de coaching</h2>
        <ul class="mt-3 space-y-2 text-[13.5px]">
          <li
            v-for="session in data.prochainesSessions"
            :key="session.date + session.thematique"
            class="flex items-center justify-between gap-3"
          >
            <span class="min-w-0 flex-1 truncate text-texte">
              {{ formatDate(session.date) }} · {{ session.thematique }} — {{ session.formateur }}
            </span>
            <span class="shrink-0 font-bold">{{ session.inscrits }} / {{ session.places }}</span>
          </li>
        </ul>
      </section>
    </div>

    <div class="mt-6 grid gap-6 md:grid-cols-2">
      <section>
        <div class="flex items-center justify-between">
          <h2 class="font-title text-[19px] font-light">Dernières transactions</h2>
          <NuxtLink to="/admin/transactions" class="text-[13px] underline">
            Transactions & paiements
          </NuxtLink>
        </div>
        <AdminTableauSimple class="mt-3" :colonnes="['Référence', 'Réf. FeexPay', 'Apprenant · module', 'Montant', 'Statut']">
          <tr v-for="t in data.dernieresTransactions" :key="t.reference">
            <td class="px-4 py-3 font-mono text-[12.5px]">{{ t.reference }}</td>
            <!-- Celle que cite le support FeexPay : la nôtre ne lui dit rien. -->
            <td class="px-4 py-3 font-mono text-[12.5px] text-discret">{{ t.referenceFeexpay ?? '—' }}</td>
            <td class="px-4 py-3">{{ t.apprenant }} · {{ t.module }}</td>
            <td class="px-4 py-3">{{ formatFcfa(t.montant) }}</td>
            <td class="px-4 py-3">
              <span
                class="rounded-full px-2.5 py-1 text-[11px] font-bold"
                :class="t.statut === 'reussie' ? 'bg-succes-voile text-succes' : 'bg-[#fdeeee] text-erreur'"
              >
                {{ t.statut === 'reussie' ? 'Réussie' : 'Échouée' }}
              </span>
            </td>
          </tr>
        </AdminTableauSimple>
      </section>

      <section>
        <div class="flex items-center justify-between">
          <h2 class="font-title text-[19px] font-light">Activité récente</h2>
          <NuxtLink to="/admin/historique" class="text-[13px] underline">Historique & versions</NuxtLink>
        </div>
        <ul class="mt-3 space-y-3 rounded-[14px] border border-ligne-douce bg-white p-5 text-[13.5px]">
          <li v-for="entree in data.journal" :key="entree.id">
            <span class="font-bold">{{ entree.auteur }}</span>
            <span class="text-texte"> {{ entree.action }} « {{ entree.cible }} »</span>
            <span class="block text-[12px] text-discret">{{ formatRelatif(entree.date) }}</span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
