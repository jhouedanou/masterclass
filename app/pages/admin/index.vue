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

const optionsMois = computed(() => [
  { valeur: '', libelle: '30 derniers jours' },
  ...(data.value?.moisDisponibles ?? []).map((m) => ({ valeur: m, libelle: formatMois(m) })),
])

const optionsProgrammes = [
  { valeur: '', libelle: 'Tous programmes' },
  { valeur: 'social-media', libelle: 'Social Média' },
  { valeur: 'entrepreneurs', libelle: 'Entrepreneurs' },
]

/** La barre la plus longue du top 5 sert d'étalon aux autres. */
const ventesMax = computed(() => data.value?.topModules[0]?.ventes || 1)
</script>

<template>
  <div v-if="data">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-title text-[26px] font-light">Vue d’ensemble</h1>
      <div class="flex flex-wrap gap-2.5">
        <UiFiltrePilule v-model="mois" etiquette="Mois" :options="optionsMois" />
        <UiFiltrePilule v-model="programme" etiquette="Programme" :options="optionsProgrammes" />
      </div>
    </div>

    <div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <AdminCarteIndicateur
        taille="xl"
        libelle="Inscriptions payantes"
        :valeur="String(data.inscriptions)"
        :detail="`${partObjectif} % de l’objectif (${data.objectifInscriptions}/mois)`"
        detail-accent
      />
      <AdminCarteIndicateur
        taille="xl"
        libelle="Chiffre d’affaires"
        :valeur="formatNombre(data.ca)"
        unite="FCFA"
        :detail="`Objectif : ${formatFcfa(data.objectifCa)} / mois`"
      />
      <AdminCarteIndicateur
        taille="xl"
        libelle="Marge brute"
        :valeur="formatNombre(data.margeBrute)"
        unite="FCFA"
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

    <div class="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
      <section class="rounded-[14px] border border-ligne-douce bg-white p-[22px]">
        <div class="mb-3.5 flex items-center justify-between gap-4">
          <h2 class="font-sans text-[15px] font-bold">Ventes par module — top 5</h2>
          <NuxtLink to="/admin/performances" class="shrink-0 text-[12.5px] font-bold">
            Tout voir
          </NuxtLink>
        </div>
        <ul class="flex flex-col gap-2.5 text-[13.5px]">
          <li
            v-for="module in data.topModules"
            :key="module.titre"
            class="grid grid-cols-[1fr_120px_70px] items-center gap-3"
          >
            <span class="min-w-0 truncate">{{ module.titre }}</span>
            <span class="h-[7px] rounded-full bg-piste">
              <span
                class="block h-full rounded-full"
                :class="module.programme === 'entrepreneurs' ? 'bg-entrepreneurs' : 'bg-social'"
                :style="{ width: `${(module.ventes / ventesMax) * 100}%` }"
              />
            </span>
            <b class="text-right">{{ module.ventes }}</b>
          </li>
        </ul>
      </section>

      <div class="flex flex-col gap-4">
        <section class="rounded-[14px] border border-ligne-douce bg-white p-[22px]">
          <h2 class="font-sans text-[15px] font-bold">À traiter</h2>
          <ul class="mt-3 flex flex-col gap-2.5 text-[13.5px]">
            <li class="flex items-center justify-between gap-3">
              <NuxtLink to="/admin/coaching-prive" class="text-encre hover:underline">
                Demandes de coaching privé
              </NuxtLink>
              <b class="shrink-0 text-social">{{ data.aTraiter.coachingPrive }} en attente</b>
            </li>
            <li class="flex items-center justify-between gap-3">
              <NuxtLink to="/admin/formateurs" class="text-encre hover:underline">
                Candidatures formateurs
              </NuxtLink>
              <b class="shrink-0 text-social">{{ data.aTraiter.candidatures }} nouvelles</b>
            </li>
            <li class="flex items-center justify-between gap-3">
              <NuxtLink to="/admin/sessions" class="text-encre hover:underline">
                Session à reprogrammer
              </NuxtLink>
              <b class="shrink-0 text-alerte">{{ data.aTraiter.sessionsAReprogrammer }}</b>
            </li>
          </ul>
        </section>

        <section class="rounded-[14px] border border-ligne-douce bg-white p-[22px]">
          <h2 class="font-sans text-[15px] font-bold">Prochaines sessions de coaching</h2>
          <ul class="mt-3 flex flex-col gap-2.5 text-[13px] text-texte">
            <li
              v-for="session in data.prochainesSessions"
              :key="session.date + session.thematique"
              class="flex items-center justify-between gap-3"
            >
              <span class="min-w-0 truncate">
                {{ formatJourMois(session.date) }} · {{ session.thematique }} —
                {{ abregerPrenom(session.formateur) }}
              </span>
              <b class="shrink-0">{{ session.inscrits }} / {{ session.places }}</b>
            </li>
          </ul>
        </section>
      </div>
    </div>

    <div class="mt-4 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
      <section class="rounded-[14px] border border-ligne-douce bg-white p-[22px]">
        <div class="mb-3.5 flex items-center justify-between gap-4">
          <h2 class="font-sans text-[15px] font-bold">Dernières transactions</h2>
          <NuxtLink to="/admin/transactions" class="shrink-0 text-[12.5px] font-bold">
            Transactions &amp; paiements
          </NuxtLink>
        </div>
        <div class="overflow-x-auto">
          <ul class="flex min-w-[430px] flex-col gap-2.5 text-[13px]">
            <li
              v-for="t in data.dernieresTransactions"
              :key="t.reference"
              class="grid grid-cols-[110px_1fr_90px_80px] items-center gap-3"
            >
              <span class="truncate font-mono text-[12px]" :title="t.reference">{{ t.reference }}</span>
              <span class="min-w-0 truncate">{{ t.apprenant }} · {{ t.module }}</span>
              <b class="text-right">{{ formatFranc(t.montant) }}</b>
              <span
                class="rounded-full px-[9px] py-[3px] text-center text-[10.5px] font-bold"
                :class="
                  t.statut === 'reussie'
                    ? 'bg-succes-voile text-succes'
                    : 'bg-erreur-voile text-erreur-fonce'
                "
              >
                {{ t.statut === 'reussie' ? 'Réussie' : 'Échouée' }}
              </span>
            </li>
          </ul>
        </div>
        <!-- Les trois mesures d'audience viennent de Google Analytics, qui
             n'est pas encore relié : un tiret vaut mieux qu'un chiffre
             inventé. Le libellé mène au réglage, sans rompre la ligne que
             dessine la maquette. -->
        <div class="mt-3.5 flex flex-wrap gap-x-[22px] gap-y-1.5 border-t border-ligne-claire pt-3 text-[12.5px] text-discret">
          <span>
            <NuxtLink to="/admin/tracking" class="text-inherit hover:underline">
              Trafic du jour
            </NuxtLink>
            : <b class="text-encre">— visiteurs</b>
          </span>
          <span>Taux de conversion : <b class="text-encre">—</b></span>
          <span><b class="text-encre">—</b> % mobile</span>
        </div>
      </section>

      <section class="rounded-[14px] border border-ligne-douce bg-white p-[22px]">
        <div class="mb-3.5 flex items-center justify-between gap-4">
          <h2 class="font-sans text-[15px] font-bold">Activité récente</h2>
          <NuxtLink to="/admin/historique" class="shrink-0 text-[12.5px] font-bold">
            Historique &amp; versions
          </NuxtLink>
        </div>
        <ul class="flex flex-col gap-2.5 text-[13px] text-texte">
          <li v-for="entree in data.journal" :key="entree.id" class="flex justify-between gap-3">
            <span><b>{{ entree.auteur }}</b>{{ ' ' }}{{ entree.action }} « {{ entree.cible }} »</span>
            <span class="whitespace-nowrap text-discret">{{ formatRelatif(entree.date) }}</span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
