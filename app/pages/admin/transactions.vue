<script setup lang="ts">
import type { CodeEchecPaiement, Transaction } from '#shared/types'
import type { ColonneCsv } from '~/utils/csv'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Transactions — administration')

const auth = useAuthStore()
const statut = ref<'' | 'reussie' | 'echouee' | 'en-attente'>('')
const codeEchec = ref<'' | CodeEchecPaiement>('')
const mois = ref('')

type LigneTransaction = Transaction & { apprenant: string; module: string }

const { data, error } = await useFetch<{
  transactions: LigneTransaction[]
  moisDisponibles: string[]
  echecs30j: { total: number; parMotif: Partial<Record<CodeEchecPaiement, number>> }
}>('/api/admin/transactions', {
  query: computed(() => ({
    statut: statut.value || undefined,
    codeEchec: codeEchec.value || undefined,
    mois: mois.value || undefined,
  })),
})

const LIBELLES_STATUT = { reussie: 'Réussie', echouee: 'Échouée', 'en-attente': 'En attente' } as const

const nomDuMois = (valeur: string) =>
  new Date(`${valeur}-01T00:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

/** L'export suit les filtres : ce qui est à l'écran est ce qui part. */
function exporter() {
  exporterCsv(
    `transactions-${mois.value || 'toutes'}`,
    [
      { cle: 'date', libelle: 'Date' },
      { cle: 'reference', libelle: 'Référence' },
      { cle: (t) => t.referencePrestataire ?? '', libelle: 'Réf. FeexPay' },
      { cle: 'apprenant', libelle: 'Apprenant' },
      { cle: 'module', libelle: 'Module' },
      { cle: 'moyen', libelle: 'Moyen de paiement' },
      { cle: (t) => t.reseau ?? '', libelle: 'Réseau' },
      { cle: 'montant', libelle: 'Montant (FCFA)' },
      { cle: (t) => LIBELLES_STATUT[t.statut], libelle: 'Statut' },
      { cle: (t) => t.codeEchec ?? '', libelle: 'Motif d’échec' },
      { cle: (t) => t.detailEchec ?? '', libelle: 'Détail' },
    ] satisfies ColonneCsv<LigneTransaction>[],
    data.value?.transactions ?? [],
  )
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-title text-[26px] font-light">Transactions &amp; paiements</h1>
      <div v-if="data" class="flex flex-wrap gap-2">
        <select v-model="mois" class="rounded-[10px] border border-ligne bg-white px-3 py-2 text-[13.5px]">
          <option value="">Tous les mois</option>
          <option v-for="m in data.moisDisponibles" :key="m" :value="m">{{ nomDuMois(m) }}</option>
        </select>
        <UiBaseButton taille="sm" variante="contour" @click="exporter">Exporter en CSV</UiBaseButton>
      </div>
    </div>

    <!-- Droit « Transactions » réservé à l'administrateur supérieur. -->
    <div v-if="error" class="mt-6 rounded-[14px] border border-ligne bg-white p-10 text-center">
      <p class="text-[28px]">🔒</p>
      <p class="mt-3 font-title text-[21px] font-light">Accès restreint</p>
      <p class="mx-auto mt-2 max-w-[520px] text-[14px] text-texte">
        Votre compte ({{ auth.utilisateur?.role }}) n’a pas le droit « Transactions ». Seul un
        administrateur de niveau supérieur peut vous l’accorder. Cette tentative d’accès est
        journalisée.
      </p>
    </div>

    <template v-else-if="data">
      <p class="mt-2 text-[12.5px] text-discret">
        Lecture seule — la source de vérité comptable reste le back-office FeexPay. Le
        rapprochement quotidien reste à brancher.
      </p>

      <!-- Suivi des échecs (planche C, écran 18f) -->
      <div class="mt-5 grid gap-4 sm:grid-cols-[220px_1fr]">
        <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
          <p class="font-title text-[30px] font-light" :class="data.echecs30j.total ? 'text-erreur' : ''">{{ data.echecs30j.total }}</p>
          <p class="mt-1 text-[13px] text-discret">échec(s) de paiement sur 30 jours</p>
        </div>
        <div class="rounded-[14px] border border-ligne-douce bg-white p-5">
          <p class="surtitre text-discret">Par motif</p>
          <ul class="mt-2 flex flex-wrap gap-2">
            <li v-for="(e, code) in ECHECS_PAIEMENT" :key="code">
              <button
                class="rounded-full border px-3 py-1.5 text-[12.5px]"
                :class="codeEchec === code ? 'border-encre bg-encre text-white' : 'border-ligne text-texte'"
                @click="codeEchec = codeEchec === code ? '' : code; statut = codeEchec ? 'echouee' : statut"
              >
                {{ e.titre }} · {{ data.echecs30j.parMotif[code] ?? 0 }}
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div class="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
        <button
          v-for="option in [
            { valeur: '', libelle: 'Toutes' },
            { valeur: 'reussie', libelle: 'Réussies' },
            { valeur: 'echouee', libelle: 'Échouées' },
            { valeur: 'en-attente', libelle: 'En attente' },
          ]"
          :key="option.valeur"
          class="rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold"
          :class="statut === option.valeur ? 'border-encre bg-encre text-white' : 'border-ligne text-texte'"
          @click="statut = option.valeur as typeof statut; if (option.valeur !== 'echouee') codeEchec = ''"
        >
          {{ option.libelle }}
        </button>
      </div>

      <AdminTableauSimple
        class="mt-4"
        :colonnes="['Réf. FeexPay', 'Date', 'Apprenant', 'Module', 'Moyen', 'Montant', 'Statut', 'Motif d’échec']"
      >
        <tr v-for="t in data.transactions" :key="t.reference">
          <td class="px-4 py-3 font-mono text-[12.5px]">{{ t.reference }}</td>
          <td class="px-4 py-3 text-[12.5px]">{{ formatDate(t.date) }}</td>
          <td class="px-4 py-3">{{ t.apprenant }}</td>
          <td class="px-4 py-3">{{ t.module }}</td>
          <td class="px-4 py-3">{{ t.moyen }}</td>
          <td class="px-4 py-3">{{ formatFcfa(t.montant) }}</td>
          <td class="px-4 py-3">
            <span
              class="rounded-full px-2.5 py-1 text-[11px] font-bold"
              :class="{
                'bg-succes-voile text-succes': t.statut === 'reussie',
                'bg-[#fdeeee] text-erreur': t.statut === 'echouee',
                'bg-alerte-voile text-alerte': t.statut === 'en-attente',
              }"
            >
              {{ LIBELLES_STATUT[t.statut] }}
            </span>
          </td>
          <td class="px-4 py-3 text-[12.5px]">
            <template v-if="t.codeEchec">
              <span class="font-bold">{{ LIBELLES_ECHEC[t.codeEchec] }}</span>
              <span v-if="t.detailEchec" class="block text-discret">{{ t.detailEchec }}</span>
            </template>
            <span v-else class="text-discret">—</span>
          </td>
        </tr>
        <tr v-if="!data.transactions.length">
          <td colspan="8" class="px-4 py-6 text-center text-[13px] text-discret">Aucune transaction dans ce filtre.</td>
        </tr>
      </AdminTableauSimple>
    </template>
  </div>
</template>
