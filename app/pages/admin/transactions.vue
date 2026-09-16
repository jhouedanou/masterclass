<script setup lang="ts">
import type { CodeEchecPaiement, Transaction } from '#shared/types'
import type { ColonneCsv } from '~/utils/csv'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Transactions — administration')

const auth = useAuthStore()
const statut = ref<'' | 'reussie' | 'echouee' | 'en-attente'>('')
const codeEchec = ref<'' | CodeEchecPaiement | 'autre'>('')
// Mois courant par défaut : l'écran 18f s'ouvre sur « Sept. 2026 ▾ ».
const mois = ref(new Date().toISOString().slice(0, 7))

type Suite = 'paye-j1' | 'relance' | 'sans-suite'
type LigneTransaction = Transaction & { apprenant: string; module: string; motif: string; suite: Suite | null }

const { data, error } = await useFetch<{
  transactions: LigneTransaction[]
  moisDisponibles: string[]
  echecs: {
    total: number
    parMotif: { code: CodeEchecPaiement | 'autre'; libelle: string; total: number; part: number }[]
    partPayesJ1: number | null
  }
}>('/api/admin/transactions', {
  query: computed(() => ({
    statut: statut.value || undefined,
    codeEchec: codeEchec.value || undefined,
    mois: mois.value || undefined,
  })),
})

const LIBELLES_STATUT = { reussie: 'Réussie', echouee: 'Échouée', 'en-attente': 'En attente' } as const
const LIBELLES_SUITE: Record<Suite, string> = {
  'paye-j1': 'Payé à J+1 ✓',
  relance: 'Relancé',
  'sans-suite': 'Sans suite',
}

/** « Sept. 2026 », libellé du sélecteur de mois de la maquette. */
const moisCourt = (valeur: string) => {
  const libelle = new Date(`${valeur}-01T00:00:00`).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
  return libelle.charAt(0).toUpperCase() + libelle.slice(1)
}

// Le mois courant peut ne rien contenir encore : il reste proposé pour que le
// sélecteur affiche toujours ce qui est filtré.
const moisProposes = computed(() => [...new Set([mois.value, ...(data.value?.moisDisponibles ?? [])].filter(Boolean))])

const echecsAffiches = computed(() => (data.value?.transactions ?? []).filter((t) => t.statut === 'echouee'))

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
      { cle: (t) => (t.statut === 'echouee' ? t.motif : ''), libelle: 'Motif' },
      { cle: (t) => t.detailEchec ?? '', libelle: 'Détail' },
      { cle: (t) => (t.suite ? LIBELLES_SUITE[t.suite] : ''), libelle: 'Suite' },
    ] satisfies ColonneCsv<LigneTransaction>[],
    data.value?.transactions ?? [],
  )
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-title text-[26px] font-light">
        Échecs de paiement
        <template v-if="data"> — {{ data.echecs.total }} tentative{{ data.echecs.total > 1 ? 's' : '' }} non abouties</template>
      </h1>
      <div v-if="data" class="flex flex-wrap gap-2">
        <select v-model="mois" class="rounded-full border border-ligne bg-white px-3.5 py-2 text-[13px]" aria-label="Mois">
          <option v-for="m in moisProposes" :key="m" :value="m">{{ moisCourt(m) }} ▾</option>
          <option value="">Tous les mois</option>
        </select>
        <UiBaseButton taille="sm" variante="contour" @click="exporter">Exporter CSV</UiBaseButton>
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
      <!-- 18f · Répartition par motif -->
      <section class="mt-5 rounded-[14px] border border-ligne-douce bg-white p-6">
        <h2 class="font-title text-[19px] font-light">Répartition par motif (données FeexPay)</h2>
        <ul class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <li v-for="m in data.echecs.parMotif" :key="m.code">
            <button
              class="w-full rounded-[10px] border px-3.5 py-2.5 text-left text-[13.5px]"
              :class="codeEchec === m.code ? 'border-encre bg-encre text-white' : 'border-ligne text-texte'"
              :aria-pressed="codeEchec === m.code"
              @click="codeEchec = codeEchec === m.code ? '' : m.code; statut = codeEchec ? 'echouee' : statut"
            >
              <span class="flex justify-between gap-3">
                <span>{{ m.libelle }}</span>
                <span :class="codeEchec === m.code ? '' : 'text-discret'">{{ m.total }} · {{ m.part }} %</span>
              </span>
              <span class="mt-1.5 block h-1.5 w-full rounded-full" :class="codeEchec === m.code ? 'bg-white/30' : 'bg-fond-voile'">
                <span class="block h-full rounded-full" :class="codeEchec === m.code ? 'bg-white' : 'bg-erreur'" :style="{ width: `${m.part}%` }" />
              </span>
            </button>
          </li>
        </ul>
        <p class="mt-4 text-[12.5px] text-discret">
          <template v-if="data.echecs.partPayesJ1 !== null">
            {{ data.echecs.partPayesJ1 }} % des échecs sont suivis d’un paiement réussi dans les 24 h —
          </template>
          <template v-else>Aucun échec sur le mois —</template>
          relance automatique email + WhatsApp après un échec « solde insuffisant ».
        </p>
      </section>

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

      <!-- Vue « échecs » de la maquette : Réf. FeexPay · Apprenant · Motif · Moyen · Suite -->
      <AdminTableauSimple
        v-if="statut === 'echouee'"
        class="mt-4"
        :colonnes="['Réf. FeexPay', 'Apprenant', 'Motif', 'Moyen', 'Suite']"
      >
        <tr v-for="t in echecsAffiches" :key="t.reference">
          <td class="px-4 py-3 font-mono text-[12.5px]">{{ t.referencePrestataire ?? t.reference }}</td>
          <td class="px-4 py-3">
            {{ t.apprenant }}
            <span class="block text-[12px] text-discret">{{ t.module }} · {{ formatDate(t.date) }}</span>
          </td>
          <td class="px-4 py-3 text-[12.5px]">
            <span class="font-bold">{{ t.motif }}</span>
            <span v-if="t.detailEchec" class="block text-discret">{{ t.detailEchec }}</span>
          </td>
          <td class="px-4 py-3">{{ t.moyen }}</td>
          <td class="px-4 py-3">
            <span
              v-if="t.suite"
              class="rounded-full px-2.5 py-1 text-[11px] font-bold"
              :class="{
                'bg-succes-voile text-succes': t.suite === 'paye-j1',
                'bg-alerte-voile text-alerte': t.suite === 'relance',
                'bg-fond-voile text-discret': t.suite === 'sans-suite',
              }"
            >
              {{ LIBELLES_SUITE[t.suite] }}
            </span>
          </td>
        </tr>
        <tr v-if="!echecsAffiches.length">
          <td colspan="5" class="px-4 py-6 text-center text-[13px] text-discret">Aucun échec dans ce filtre.</td>
        </tr>
      </AdminTableauSimple>

      <AdminTableauSimple
        v-else
        class="mt-4"
        :colonnes="['Réf. FeexPay', 'Date', 'Apprenant', 'Module', 'Moyen', 'Montant', 'Statut', 'Motif', 'Suite']"
      >
        <tr v-for="t in data.transactions" :key="t.reference">
          <td class="px-4 py-3 font-mono text-[12.5px]">{{ t.referencePrestataire ?? t.reference }}</td>
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
            <template v-if="t.statut === 'echouee'">
              <span class="font-bold">{{ t.motif }}</span>
              <span v-if="t.detailEchec" class="block text-discret">{{ t.detailEchec }}</span>
            </template>
            <span v-else class="text-discret">—</span>
          </td>
          <td class="px-4 py-3 text-[12.5px]">{{ t.suite ? LIBELLES_SUITE[t.suite] : '—' }}</td>
        </tr>
        <tr v-if="!data.transactions.length">
          <td colspan="9" class="px-4 py-6 text-center text-[13px] text-discret">Aucune transaction dans ce filtre.</td>
        </tr>
      </AdminTableauSimple>

      <p class="mt-3 text-[12.5px] text-discret">
        Lecture seule — la source de vérité comptable reste le back-office FeexPay.
      </p>
    </template>
  </div>
</template>
