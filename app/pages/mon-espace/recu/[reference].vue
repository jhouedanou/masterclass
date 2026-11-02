<script setup lang="ts">
import { ORGANISATION } from '#shared/utils/contact'

/**
 * Reçu d'un achat (CDC 10.C) : numéro, date, libellé, montant, moyen de
 * paiement. Module, Live Session ou séance de coaching privé. Imprimable :
 * l'impression masque la navigation de l'espace.
 */
definePageMeta({ layout: 'espace', middleware: 'auth' })

const route = useRoute()
const { data, error } = await useFetch<{
  numero: string
  date: string
  client: { nom: string; email: string }
  lignes: { libelle: string; montant: number }[]
  total: number
  moyen: string | null
  referencePrestataire: string | null
}>(() => `/api/mon-espace/recu/${encodeURIComponent(String(route.params.reference))}`)

if (!data.value) {
  throw createError({ statusCode: error.value?.statusCode ?? 404, statusMessage: 'Reçu introuvable', fatal: true })
}
usePagePrivee(`Reçu ${data.value.numero}`)

function imprimer() {
  window.print()
}

const dateLisible = computed(() =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(
    new Date(data.value!.date),
  ) + ' GMT',
)
</script>

<template>
  <div v-if="data" class="mx-auto w-full max-w-[640px]">
    <div class="mb-4 flex items-center justify-between gap-3 print:hidden">
      <NuxtLink to="/mon-espace" class="text-[14px] text-discret hover:text-encre">← Mon espace</NuxtLink>
      <UiBaseButton taille="sm" variante="contour" @click="imprimer">Imprimer</UiBaseButton>
    </div>
    <article class="rounded-carte border border-ligne-douce bg-white p-8 print:border-0 print:p-0">
      <header class="flex flex-wrap items-start justify-between gap-4 border-b border-ligne-claire pb-5">
        <div>
          <p class="text-[12px] font-bold tracking-[0.12em] text-social uppercase">{{ ORGANISATION.marque }}</p>
          <h1 class="mt-1 font-title text-[26px] font-light">Reçu de paiement</h1>
        </div>
        <dl class="text-right text-[13.5px]">
          <dt class="text-discret">Numéro</dt>
          <dd class="font-mono font-bold">{{ data.numero }}</dd>
          <dt class="mt-1.5 text-discret">Date</dt>
          <dd class="font-bold">{{ dateLisible }}</dd>
        </dl>
      </header>

      <section class="mt-5 text-[14px]">
        <p class="text-discret">Client</p>
        <p class="font-bold">{{ data.client.nom }}</p>
        <p class="text-texte">{{ data.client.email }}</p>
      </section>

      <table class="mt-6 w-full text-[14px]">
        <caption class="sr-only">Détail de l’achat</caption>
        <thead>
          <tr class="border-b border-ligne-claire text-left text-discret">
            <th scope="col" class="pb-2 font-normal">Libellé</th>
            <th scope="col" class="pb-2 text-right font-normal">Montant</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ligne in data.lignes" :key="ligne.libelle" class="border-b border-ligne-claire">
            <td class="py-3 pr-4">{{ ligne.libelle }}</td>
            <td class="py-3 text-right whitespace-nowrap">{{ formatFcfa(ligne.montant) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" class="pt-3 text-left">Total TTC</th>
            <td class="pt-3 text-right text-[17px] font-bold whitespace-nowrap">{{ formatFcfa(data.total) }}</td>
          </tr>
        </tfoot>
      </table>

      <dl class="mt-6 grid gap-1 text-[13.5px] text-texte">
        <div v-if="data.moyen" class="flex gap-2"><dt class="text-discret">Moyen de paiement :</dt><dd>{{ data.moyen }}</dd></div>
        <div v-if="data.referencePrestataire" class="flex gap-2">
          <dt class="text-discret">Référence FeexPay :</dt><dd class="font-mono">{{ data.referencePrestataire }}</dd>
        </div>
      </dl>
      <p class="mt-6 border-t border-ligne-claire pt-4 text-[12px] text-discret">
        {{ ORGANISATION.raisonSociale }} · {{ ORGANISATION.ville }} · {{ ORGANISATION.email }}
      </p>
    </article>
  </div>
</template>
