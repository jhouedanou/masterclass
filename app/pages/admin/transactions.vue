<script setup lang="ts">
import type { Transaction } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Transactions — administration')

const auth = useAuthStore()
const { data: transactions, error } = await useFetch<(Transaction & { apprenant: string; module: string })[]>(
  '/api/admin/transactions',
)
</script>

<template>
  <div>
    <h1 class="font-title text-[26px] font-light">Transactions & paiements</h1>

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

    <template v-else>
      <p class="mt-2 text-[12.5px] text-discret">
        Lecture seule — la source de vérité comptable reste le back-office FeexPay. Le
        rapprochement quotidien reste à brancher.
      </p>

      <AdminTableauSimple
        class="mt-5"
        :colonnes="['Réf. FeexPay', 'Apprenant', 'Module', 'Moyen', 'Montant', 'Statut']"
      >
        <tr v-for="t in transactions" :key="t.reference">
          <td class="px-4 py-3 font-mono text-[12.5px]">{{ t.reference }}</td>
          <td class="px-4 py-3">{{ t.apprenant }}</td>
          <td class="px-4 py-3">{{ t.module }}</td>
          <td class="px-4 py-3">{{ t.moyen }}</td>
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
    </template>
  </div>
</template>
