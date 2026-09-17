<script setup lang="ts">
import type { CodeEchecPaiement, Transaction } from '#shared/types'
import type { ColonneCsv } from '~/utils/csv'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Transactions — administration')

const auth = useAuthStore()
// Valeur de pilule : une chaîne, comme l'attend `UiFiltrePilule`.
const statut = ref('')
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
const optionsMois = computed(() => [
  ...[...new Set([mois.value, ...(data.value?.moisDisponibles ?? [])].filter(Boolean))].map((m) => ({
    valeur: m,
    libelle: moisCourt(m),
  })),
  { valeur: '', libelle: 'Tous les mois' },
])

const optionsStatut = [
  { valeur: '', libelle: 'Tous statuts' },
  { valeur: 'reussie', libelle: 'Réussies' },
  { valeur: 'echouee', libelle: 'Échouées' },
  { valeur: 'en-attente', libelle: 'En attente' },
]

/**
 * La maquette peint chaque motif d'échec d'une teinte propre, de la plus grave
 * à la plus anodine ; aucune n'a de jeton, l'ordre du tableau fait la couleur.
 */
const COULEURS_MOTIF = ['#c03434', '#d96a3b', '#a06a12', '#6d6a75', '#8a8695', '#c9c4d3']

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
    <div class="mb-[18px] flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-title text-[22px] font-light">
        Échecs de paiement
        <template v-if="data"> — {{ data.echecs.total }} tentative{{ data.echecs.total > 1 ? 's' : '' }} non abouties</template>
      </h1>
      <UiFiltrePilule v-if="data" v-model="mois" etiquette="Mois" :options="optionsMois" />
    </div>

    <!-- Droit « Transactions » réservé à l'administrateur supérieur. -->
    <div v-if="error" class="rounded-carte border border-ligne bg-white p-9 text-center">
      <p class="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-piste text-[22px] text-discret">🔒</p>
      <b class="text-[16px]">Transactions &amp; paiements — accès restreint</b>
      <p class="mx-auto mt-2 max-w-[480px] text-[13px] leading-[1.6] text-discret">
        Votre compte ({{ auth.utilisateur?.role }}) n’a pas le droit « Transactions ». Seul un admin
        de niveau supérieur peut vous l’accorder. Cette tentative d’accès a été journalisée.
      </p>
    </div>

    <template v-else-if="data">
      <!-- 18f · répartition des échecs et détail, côte à côte. -->
      <div class="grid items-start gap-4 xl:grid-cols-[1fr_1.2fr]">
        <section class="rounded-bloc border border-ligne-douce bg-white p-[22px]">
          <h2 class="font-sans text-[15px] font-bold">Répartition par motif (données FeexPay)</h2>
          <ul class="mt-4 flex flex-col gap-[11px] text-[13px]">
            <li v-for="(m, i) in data.echecs.parMotif" :key="m.code">
              <!-- Chaque motif filtre le détail ; au repos la ligne est celle
                   de la maquette, la sélection se lit sur le libellé. -->
              <button
                class="block w-full text-left"
                :aria-pressed="codeEchec === m.code"
                @click="codeEchec = codeEchec === m.code ? '' : m.code; statut = codeEchec ? 'echouee' : statut"
              >
                <span class="mb-[5px] flex justify-between gap-3">
                  <span :class="codeEchec === m.code && 'font-bold text-social'">{{ m.libelle }}</span>
                  <b>{{ m.total }} · {{ m.part }} %</b>
                </span>
                <span class="block h-[9px] rounded-full bg-piste">
                  <span
                    class="block h-full rounded-full"
                    :style="{ width: `${m.part}%`, background: COULEURS_MOTIF[i % COULEURS_MOTIF.length] }"
                  />
                </span>
              </button>
            </li>
          </ul>
          <p class="mt-4 rounded-[10px] border border-succes-bordure bg-succes-voile px-[15px] py-3 text-[12.5px] leading-[1.6] text-succes-fonce">
            <template v-if="data.echecs.partPayesJ1 !== null">
              {{ data.echecs.partPayesJ1 }} % des échecs sont suivis d’un paiement réussi dans les
              24 h —
            </template>
            <template v-else>Aucun échec sur le mois —</template>
            relance automatique email + WhatsApp après un échec « solde insuffisant ».
          </p>
        </section>

        <AdminTableauSimple
          :colonnes="['Réf. FeexPay', 'Apprenant', 'Motif', 'Moyen', 'Suite']"
          :largeurs="['120px', 'calc((100% - 370px) * 0.5455)', 'calc((100% - 370px) * 0.4545)', '120px', '130px']"
          largeur-min="620px"
        >
          <tr v-for="t in echecsAffiches" :key="t.reference">
            <td class="px-[18px] py-[13px] font-mono text-[12.5px]">{{ t.referencePrestataire ?? t.reference }}</td>
            <td class="px-[18px] py-[13px] text-[12.5px]">
              {{ t.apprenant }}
              <span class="block text-[12px] text-discret">{{ t.module }} · {{ formatDate(t.date) }}</span>
            </td>
            <td class="px-[18px] py-[13px] text-[12.5px] font-bold text-erreur">
              {{ t.motif }}
              <span v-if="t.detailEchec" class="block font-normal text-discret">{{ t.detailEchec }}</span>
            </td>
            <td class="px-[18px] py-[13px] text-[12.5px]">{{ t.moyen }}</td>
            <td class="px-[18px] py-[13px]">
              <span
                v-if="t.suite"
                class="block rounded-full px-[9px] py-[3px] text-center text-[10.5px] font-bold whitespace-nowrap"
                :class="{
                  'bg-succes-voile text-succes': t.suite === 'paye-j1',
                  'bg-alerte-voile text-alerte': t.suite === 'relance',
                  'bg-piste text-discret': t.suite === 'sans-suite',
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
      </div>

      <!-- 14 · vue autorisée : la carte grise de la maquette, tableau à
           l'intérieur. -->
      <section class="mt-5 rounded-carte border border-ligne bg-fond-cadre p-[26px]">
        <div class="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
          <b class="text-[15px]">Transactions — vue autorisée (admin principal)</b>
          <span class="flex flex-wrap items-center gap-2">
            <UiFiltrePilule v-model="statut" etiquette="Statut" :options="optionsStatut" />
            <UiBaseButton taille="sm" variante="contour" @click="exporter">Exporter CSV</UiBaseButton>
          </span>
        </div>

        <AdminTableauSimple
          :colonnes="['Réf. FeexPay', 'Apprenant', 'Module', 'Moyen', 'Montant', 'Statut']"
          :largeurs="['130px', 'calc((100% - 470px) * 0.5652)', 'calc((100% - 470px) * 0.4348)', '120px', '110px', '110px']"
          largeur-min="740px"
        >
          <tr v-for="t in data.transactions" :key="t.reference">
            <td class="px-4 py-[13px] font-mono text-[12.5px]">{{ t.referencePrestataire ?? t.reference }}</td>
            <td class="px-4 py-[13px] text-[12.5px]">{{ t.apprenant }}</td>
            <td class="px-4 py-[13px] text-[12.5px]">{{ t.module }}</td>
            <td class="px-4 py-[13px] text-[12.5px]">{{ t.moyen }}</td>
            <td class="px-4 py-[13px] text-[12.5px] font-bold">{{ formatFranc(t.montant) }}</td>
            <td class="px-4 py-[13px]">
              <span
                class="block rounded-full px-[9px] py-[3px] text-center text-[10.5px] font-bold whitespace-nowrap"
                :class="{
                  'bg-succes-voile text-succes': t.statut === 'reussie',
                  'bg-erreur-voile text-erreur-fonce': t.statut === 'echouee',
                  'bg-alerte-voile text-alerte': t.statut === 'en-attente',
                }"
              >
                {{ LIBELLES_STATUT[t.statut] }}
              </span>
            </td>
          </tr>
          <tr v-if="!data.transactions.length">
            <td colspan="6" class="px-4 py-6 text-center text-[13px] text-discret">Aucune transaction dans ce filtre.</td>
          </tr>
        </AdminTableauSimple>

        <p class="mt-2.5 text-[11.5px] text-discret">
          Lecture seule — la source de vérité comptable reste le back-office FeexPay.
          Rapprochement automatique quotidien.
        </p>
      </section>
    </template>
  </div>
</template>
