<script setup lang="ts">
import type { Certificat } from '#shared/types'

definePageMeta({ layout: false, middleware: 'auth' })

const route = useRoute()
const { data } = await useFetch<{
  certificat: Certificat
  lienVerification: string
  qrDataUrl: string
}>(() => `/api/certificats/${route.params.numero}`)

if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Certificat introuvable', fatal: true })
}

const c = computed(() => data.value!.certificat)
usePagePrivee(`Certificat ${c.value.numero}`)

function imprimer() {
  window.print()
}
</script>

<template>
  <div v-if="data" class="min-h-screen bg-fond py-8 print:bg-white print:py-0">
    <div class="no-print conteneur mb-6 flex flex-wrap items-center justify-between gap-3">
      <NuxtLink to="/mon-espace/certificats" class="text-[14px] text-discret hover:underline">
        ← Mes certificats
      </NuxtLink>
      <div class="flex gap-2">
        <UiBaseButton taille="sm" @click="imprimer">Imprimer / enregistrer en PDF</UiBaseButton>
        <UiBaseButton :to="`/verifier/${c.numero}`" variante="contour" taille="sm">
          Page de vérification
        </UiBaseButton>
      </div>
    </div>

    <!--
      Certificat de participation — variables issues du squelette « Attestation de
      suivi de module » fourni par le client. Mise en page A4 paysage.
    -->
    <article
      class="mx-auto flex aspect-[297/210] w-full max-w-5xl flex-col bg-white p-12 shadow-lg print:aspect-auto print:h-screen print:max-w-none print:shadow-none"
    >
      <header class="flex items-start justify-between gap-6">
        <img src="/images/brand/logo.png" alt="E-Masterclass Big Five" class="h-14 w-auto">
        <div class="text-right text-[12px] text-discret">
          <p>N° {{ c.numero }}</p>
          <p>Délivré le {{ formatDate(c.dateDelivrance) }}</p>
        </div>
      </header>

      <div class="mt-10 flex-1">
        <p class="surtitre text-social">Attestation de suivi de module</p>

        <p class="mt-8 text-[15px] text-texte">E-Masterclass Big Five atteste que</p>
        <p class="mt-2 font-title text-[42px] font-medium text-encre">{{ c.prenomNom }}</p>

        <p class="mt-6 text-[15px] text-texte">a suivi intégralement le module</p>
        <p class="mt-2 font-title text-[26px] font-light text-social">{{ c.titreModule }}</p>

        <dl class="mt-8 grid max-w-3xl grid-cols-2 gap-x-10 gap-y-2 text-[13px] sm:grid-cols-4">
          <div><dt class="text-discret">Programme</dt><dd class="text-encre">{{ c.programme }}</dd></div>
          <div><dt class="text-discret">Thématique</dt><dd class="text-encre">{{ c.thematique }}</dd></div>
          <div><dt class="text-discret">Formateur</dt><dd class="text-encre">{{ c.formateur }}</dd></div>
          <div><dt class="text-discret">Durée</dt><dd class="text-encre">{{ formatDuree(c.dureeMinutes) }}</dd></div>
          <div><dt class="text-discret">Réalisation</dt><dd class="text-encre">{{ formatDate(c.dateRealisation) }}</dd></div>
          <div><dt class="text-discret">Complétion</dt><dd class="text-encre">{{ c.tauxCompletion }} %</dd></div>
        </dl>
      </div>

      <footer class="flex flex-wrap items-end justify-between gap-8 border-t border-ligne-claire pt-6">
        <p class="max-w-md text-[11.5px] leading-relaxed text-discret">
          Cette attestation confirme le suivi du module et ne constitue ni un diplôme ni une
          certification professionnelle.
          <br>
          Vérifiable sur {{ data.lienVerification }}
        </p>

        <div class="text-center">
          <img :src="data.qrDataUrl" alt="QR code de vérification du certificat" class="size-20">
          <p class="mt-1 text-[10px] text-discret">Vérifier</p>
        </div>

        <div class="text-center">
          <div class="w-44 border-t border-ligne" />
          <p class="mt-1 text-[12px] text-texte">Direction E-Masterclass Big Five</p>
        </div>
      </footer>
    </article>
  </div>
</template>
