<script setup lang="ts">
/**
 * Relevé mensuel imprimable (planche D, écran 06 : « Télécharger le relevé
 * PDF »). Même principe que l'attestation de l'apprenant : une page A4 mise en
 * page pour l'impression, et la boîte d'impression du navigateur produit le
 * PDF — pas de générateur à embarquer côté serveur.
 */
definePageMeta({ layout: false, middleware: 'formateur' })

const route = useRoute()
const mois = computed(() => String(route.params.mois))
const auth = useAuthStore()

const { data } = await useFetch<{
  lignes: { libelle: string; ventes: number; ca: number; marge: number; part: number }[]
  total: { ca: number; frais: number; marge: number; remuneration: number; margePlateforme: number }
}>(() => `/api/formateur/revenus?mois=${mois.value}`)

if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Relevé introuvable', fatal: true })
}

usePagePrivee(`Relevé ${formatMois(mois.value)}`)

const partFormateur = computed(() => {
  const { marge, remuneration } = data.value!.total
  return marge ? Math.round((remuneration / marge) * 100) : 30
})

function imprimer() {
  window.print()
}

// Arrivée depuis « Télécharger le relevé PDF » : la boîte d'impression s'ouvre.
onMounted(() => {
  if (route.query.telecharger === '1') setTimeout(() => window.print(), 600)
})
</script>

<template>
  <div v-if="data" class="min-h-screen bg-fond-clair py-8 print:bg-white print:py-0">
    <div class="no-print conteneur mb-6 flex flex-wrap items-center justify-between gap-3">
      <NuxtLink to="/formateur/revenus" class="text-[14px] text-discret hover:underline">
        ← Mes revenus
      </NuxtLink>
      <UiBaseButton taille="sm" @click="imprimer">Imprimer / enregistrer en PDF</UiBaseButton>
    </div>

    <article class="mx-auto w-full max-w-[820px] bg-white p-10 shadow-lg print:max-w-none print:p-0 print:shadow-none">
      <header class="flex items-start justify-between gap-6 border-b border-ligne pb-6">
        <img src="/images/brand/logo.png" alt="E-Masterclass | Big Five" class="h-12 w-auto">
        <div class="text-right">
          <p class="surtitre text-discret">Relevé de rémunération</p>
          <p class="mt-1 font-title text-[22px] font-light">{{ formatMois(mois) }}</p>
        </div>
      </header>

      <div class="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <p class="text-[12px] text-discret">Formateur</p>
          <p class="text-[15px] font-bold">
            {{ auth.utilisateur?.prenom }} {{ auth.utilisateur?.nom }}
          </p>
        </div>
        <div class="sm:text-right">
          <p class="text-[12px] text-discret">Édité le</p>
          <p class="text-[15px] font-bold">{{ formatDate(new Date().toISOString()) }}</p>
        </div>
      </div>

      <!-- Sous 640 px la grille du relevé ne tient pas : elle défile
           horizontalement plutôt que de se tasser. -->
      <div class="mt-8 overflow-x-auto">
      <table class="w-full min-w-[520px] text-left text-[13.5px]">
        <thead class="border-y border-ligne text-[11.5px] tracking-wider text-discret uppercase">
          <tr>
            <th class="py-2.5 font-bold">Source</th>
            <th class="py-2.5 font-bold">Ventes</th>
            <th class="py-2.5 font-bold">CA</th>
            <th class="py-2.5 font-bold">Marge brute</th>
            <th class="py-2.5 text-right font-bold">Votre part ({{ partFormateur }} %)</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ligne-claire">
          <tr v-for="ligne in data.lignes" :key="ligne.libelle">
            <td class="py-2.5 font-bold">{{ ligne.libelle }}</td>
            <td class="py-2.5">{{ ligne.ventes }}</td>
            <td class="py-2.5">{{ formatFcfa(ligne.ca) }}</td>
            <td class="py-2.5">{{ formatFcfa(ligne.marge) }}</td>
            <td class="py-2.5 text-right font-bold">{{ formatFcfa(ligne.part) }}</td>
          </tr>
          <tr v-if="!data.lignes.length">
            <td colspan="5" class="py-4 text-discret">Aucune vente sur ce mois.</td>
          </tr>
        </tbody>
        <tfoot class="border-t border-encre">
          <tr class="font-bold">
            <td class="py-3">Total</td>
            <td class="py-3" />
            <td class="py-3">{{ formatFcfa(data.total.ca) }}</td>
            <td class="py-3">{{ formatFcfa(data.total.marge) }}</td>
            <td class="py-3 text-right">{{ formatFcfa(data.total.remuneration) }}</td>
          </tr>
        </tfoot>
      </table>
      </div>

      <dl class="mt-8 grid gap-2 border-t border-ligne pt-6 text-[13px] sm:max-w-[420px]">
        <div class="flex justify-between">
          <dt class="text-discret">Chiffre d’affaires généré</dt>
          <dd class="font-bold">{{ formatFcfa(data.total.ca) }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-discret">Frais de paiement</dt>
          <dd class="font-bold">− {{ formatFcfa(data.total.frais) }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-discret">Marge brute</dt>
          <dd class="font-bold">{{ formatFcfa(data.total.marge) }}</dd>
        </div>
        <div class="flex justify-between border-t border-ligne pt-2 text-[15px]">
          <dt class="font-bold">Net à verser</dt>
          <dd class="font-bold text-social">{{ formatFcfa(data.total.remuneration) }}</dd>
        </div>
      </dl>

      <p class="mt-8 border-t border-ligne pt-4 text-[11.5px] leading-relaxed text-discret">
        Document généré par la plateforme E-Masterclass Big Five à partir des transactions réussies
        du mois. Répartition de la marge brute fixée par contrat. Versement mensuel par l’équipe.
      </p>
    </article>
  </div>
</template>

<style scoped>
@media print {
  .no-print {
    display: none;
  }
}
</style>
