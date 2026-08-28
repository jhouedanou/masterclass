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
usePagePrivee(`Attestation ${c.value.numero}`)

/**
 * Griffe de la direction : le modèle prévoit une signature manuscrite, mais le
 * fichier n'a pas encore été fourni. La page l'intègre dès qu'il est déposé en
 * /images/brand/signature.png ; en attendant, seule la ligne de signature
 * apparaît.
 */
const signatureAbsente = ref(false)

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
      Attestation de suivi de module — reproduction de la page 1 de
      maquettes/modelAttestation.pdf : motif Big Five encadrant les quatre
      bords, carte blanche centrée, nom en grandes capitales, module encadré,
      quatre repères à icônes, signature et QR de vérification.
      A4 paysage à l'impression (@page dans main.css).
    -->
    <article
      class="attestation mx-auto flex aspect-[297/210] w-full max-w-5xl flex-col bg-[url('/images/brand/pattern.png')] bg-cover bg-center p-[1.8%] shadow-lg print:aspect-auto print:h-screen print:max-w-none print:shadow-none"
    >
      <div class="flex min-h-0 flex-1 flex-col bg-white px-[4.5%] py-[2.6%]">
        <header class="flex items-start">
          <img src="/images/brand/logo.png" alt="E-Masterclass Big Five" class="h-[3.2rem] w-auto print:h-14">
        </header>

        <div class="flex min-h-0 flex-1 flex-col items-center justify-evenly text-center">
          <div>
            <h1 class="font-title text-[clamp(20px,3.2vw,34px)] font-medium tracking-[0.14em] text-encre uppercase print:text-[34px]">
              Attestation de suivi de module
            </h1>
            <div class="mx-auto mt-2 w-24 border-t border-encre/60" />
          </div>

          <p class="text-[14.5px] font-bold text-encre">E-masterclass BIG FIVE atteste que</p>

          <div>
            <p class="text-[clamp(30px,5.4vw,58px)] leading-none font-extrabold tracking-[0.08em] text-encre uppercase print:text-[58px]">
              {{ c.prenomNom }}
            </p>
            <div class="mx-auto mt-3 w-16 border-t border-encre/60" />
          </div>

          <p class="text-[14.5px] font-bold text-encre">a suivi intégralement le module</p>

          <p class="w-full rounded-[6px] border border-entrepreneurs-clair px-6 py-3.5 text-[clamp(15px,2.2vw,24px)] font-extrabold text-encre uppercase print:text-[24px]">
            {{ c.titreModule }}
          </p>

          <dl class="grid w-full grid-cols-4 gap-4 text-[13px]">
            <div
              v-for="repere in [
                { icone: 'ph:briefcase', libelle: 'Programme', valeur: c.programme },
                { icone: 'ph:target', libelle: 'Thématique', valeur: c.thematique },
                { icone: 'ph:user', libelle: 'Formateur', valeur: c.formateur },
                { icone: 'ph:clock', libelle: 'Durée', valeur: formatDuree(c.dureeMinutes) },
              ]"
              :key="repere.libelle"
              class="text-center"
            >
              <Icon :name="repere.icone" size="26" class="text-encre" />
              <dt class="mt-1.5 font-bold text-encre">{{ repere.libelle }} :</dt>
              <dd class="text-encre">{{ repere.valeur }}</dd>
            </div>
          </dl>
        </div>

        <footer class="mt-2">
          <div class="flex items-end justify-between gap-8">
            <div class="text-[13px] leading-relaxed font-bold text-encre">
              <p>Module réalisé le {{ formatDate(c.dateRealisation) }}</p>
              <p>Attestation délivrée le {{ formatDate(c.dateDelivrance) }}</p>
              <p>N° {{ c.numero }}</p>
            </div>

            <div class="flex items-end gap-10">
              <div class="text-center">
                <!-- :src dynamique : le fichier n'existe pas encore, un src
                     statique serait résolu (et refusé) au build. -->
                <img
                  v-if="!signatureAbsente"
                  :src="'/images/brand/signature.png'"
                  alt=""
                  class="mx-auto h-12 w-auto"
                  @error="signatureAbsente = true"
                >
                <div class="mx-auto w-40 border-t border-encre/50" :class="signatureAbsente ? 'mt-12' : 'mt-1'" />
                <p class="mt-1.5 text-[12px] font-bold text-encre">Direction E-Masterclass Big Five</p>
              </div>

              <div class="text-center">
                <img :src="data.qrDataUrl" alt="QR code de vérification de l’attestation" class="mx-auto size-[4.2rem]">
                <p class="mt-1.5 text-[12px] font-bold text-encre">Vérifier l’attestation</p>
                <p class="text-[8.5px] text-discret">{{ data.lienVerification }}</p>
              </div>
            </div>
          </div>

          <p class="mt-3 text-center text-[10px] text-texte">
            Cette attestation confirme le suivi intégral du module et ne constitue ni un diplôme ni
            une certification professionnelle.
          </p>
        </footer>
      </div>
    </article>
  </div>
</template>

<style>
/* Sans quoi les navigateurs suppriment le motif de fond à l'impression. */
@media print {
  .attestation {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
}
</style>
