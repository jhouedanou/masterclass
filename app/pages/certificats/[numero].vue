<script setup lang="ts">
import type { Certificat } from '#shared/types'

definePageMeta({ layout: false, middleware: 'auth' })

const route = useRoute()
type Griffe = { nom: string; image: string }

const { data } = await useFetch<{
  certificat: Certificat
  lienVerification: string
  qrDataUrl: string
  signatures: { formateur: Griffe; direction: Griffe }
}>(() => `/api/certificats/${route.params.numero}`)

if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Certificat introuvable', fatal: true })
}

const c = computed(() => data.value!.certificat)
usePagePrivee(`Attestation ${c.value.numero}`)

/**
 * Les deux griffes du pied de page : le formateur qui a donné le module, la
 * direction qui délivre l'attestation.
 *
 * Elles viennent de la base, où l'administration les dépose. Le gabarit
 * pointait jusqu'ici vers /images/brand/signature.png, un fichier du dépôt qui
 * n'a jamais été fourni — il retombait donc sur une ligne nue par un `@error`,
 * et y remédier demandait un déploiement.
 *
 * L'absence reste un état normal : tant que personne n'a signé, la ligne seule
 * s'imprime, comme aujourd'hui.
 */
const signatures = computed(() => [data.value!.signatures.formateur, data.value!.signatures.direction])

/** Une attestation révoquée ne doit plus pouvoir sortir : sans cela, la
 *  révocation ne vaudrait que pour qui pense à vérifier le numéro. */
const revoquee = computed(() => Boolean(c.value.revoqueLe))

function imprimer() {
  window.print()
}

// « Télécharger PDF » (planche B, écran 09) : la boîte d'impression s'ouvre à l'arrivée.
onMounted(() => {
  if (route.query.telecharger === '1' && !revoquee.value) setTimeout(() => window.print(), 600)
})
</script>

<template>
  <div v-if="data" class="min-h-screen bg-fond py-8 print:bg-white print:py-0">
    <div class="no-print conteneur mb-6 flex flex-wrap items-center justify-between gap-3">
      <NuxtLink to="/mon-espace/certificats" class="text-[14px] text-discret hover:underline">
        ← Mes certificats
      </NuxtLink>
      <div class="flex gap-2">
        <UiBaseButton v-if="!revoquee" taille="sm" @click="imprimer">
          Imprimer / enregistrer en PDF
        </UiBaseButton>
        <UiBaseButton :to="`/verifier/${c.numero}`" variante="contour" taille="sm">
          Page de vérification
        </UiBaseButton>
      </div>
    </div>

    <div v-if="revoquee" class="no-print conteneur">
      <div class="rounded-carte border border-erreur bg-[#fdeeee] p-8">
        <p class="font-title text-[21px] font-light text-erreur-fonce">Attestation révoquée</p>
        <p class="mt-2 text-[14px] text-erreur">
          Cette attestation a été retirée le {{ formatDate(c.revoqueLe!) }} et ne peut plus être
          présentée comme preuve de suivi de module. Pour toute question, écrivez-nous sur WhatsApp
          au {{ WHATSAPP.affichage }}.
        </p>
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
      v-if="!revoquee"
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
              <!-- Deux griffes, comme un diplôme. La hauteur réservée est la
                   même signée ou non : sans elle, le pied de page remonterait
                   dès qu'une signature manque, et deux attestations du même
                   module ne se superposeraient plus à l'impression. -->
              <div v-for="griffe in signatures" :key="griffe.nom" class="text-center">
                <img
                  v-if="griffe.image"
                  :src="griffe.image"
                  alt=""
                  class="mx-auto h-12 w-auto object-contain"
                >
                <div class="mx-auto w-40 border-t border-encre/50" :class="griffe.image ? 'mt-1' : 'mt-12'" />
                <p class="mt-1.5 text-[12px] font-bold text-encre">{{ griffe.nom }}</p>
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
