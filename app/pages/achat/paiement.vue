<script setup lang="ts">
import type { CodeEchecPaiement } from '#shared/types'

definePageMeta({ middleware: 'auth' })

const achat = useAchatStore()

const moyens = [
  { valeur: 'mobile-money', libelle: 'Mobile Money', detail: 'Orange, MTN, Moov' },
  { valeur: 'wave', libelle: 'Wave', detail: 'Paiement par QR ou numéro' },
  { valeur: 'djamo', libelle: 'Djamo', detail: 'Carte et compte Djamo' },
  { valeur: 'visa', libelle: 'Visa', detail: 'Carte bancaire internationale' },
] as const

/** Les états du tunnel (spec §8) : attente, vérification, succès, échec,
 *  nouvelle tentative et changement de moyen s'enchaînent depuis « choix ». */
const etat = ref<'choix' | 'attente' | 'verification' | 'succes' | 'echec'>('choix')
const message = ref('')
const codeEchec = ref<CodeEchecPaiement | null>(null)
const tentatives = ref(0)
/** Hors production : permet de dérouler chacun des six cas d'erreur. */
const simulerEchec = ref<CodeEchecPaiement | ''>('')
const dev = import.meta.dev

const echec = computed(() => (codeEchec.value ? ECHECS_PAIEMENT[codeEchec.value] : null))

usePagePrivee('Choisissez votre moyen de paiement')

async function payer() {
  if (!achat.module) return
  etat.value = 'attente'
  message.value = 'Validez la demande sur votre téléphone.'
  codeEchec.value = null
  try {
    etat.value = 'verification'
    const commande = await $fetch<{ reference: string }>('/api/commandes', {
      method: 'POST',
      body: {
        moduleIds: [achat.module.id],
        moyen: achat.moyen,
        simulerEchec: dev && simulerEchec.value ? simulerEchec.value : undefined,
      },
    })
    achat.reference = commande.reference
    etat.value = 'succes'
  } catch (e) {
    const reponse = e as { statusMessage?: string; data?: { code?: CodeEchecPaiement } }
    etat.value = 'echec'
    tentatives.value += 1
    codeEchec.value = reponse.data?.code ?? 'erreur-inconnue'
    message.value = reponse.statusMessage ?? 'Le paiement a échoué.'
  }
}

function changerDeMoyen() {
  etat.value = 'choix'
  codeEchec.value = null
}
</script>

<template>
  <div class="conteneur max-w-[840px] py-12">
    <UiEtapesAchat :etape="3" />

    <h1 class="mt-8 text-[36px] font-medium">Choisissez votre moyen de paiement</h1>

    <template v-if="etat === 'choix' || etat === 'echec'">
      <div v-if="etat === 'echec' && echec" class="mt-6 rounded-[14px] border border-erreur bg-[#fdeeee] p-5" role="alert">
        <p class="font-title text-[21px] font-light text-erreur-fonce">{{ echec.titre }}</p>
        <p class="mt-1 text-[14px] text-texte">{{ message }}</p>
        <p class="mt-2 text-[14px] text-texte">{{ echec.conseil }}</p>
        <p class="mt-2 text-[12.5px] text-discret">
          Aucun accès n’est ouvert tant que le paiement n’est pas confirmé.
          <template v-if="tentatives >= 2"> Si le problème persiste, notre équipe peut vous aider.</template>
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <UiBaseButton v-if="echec.action !== 'contacter'" taille="sm" @click="payer">Réessayer</UiBaseButton>
          <UiBaseButton v-if="echec.action === 'changer-moyen'" taille="sm" variante="contour" @click="changerDeMoyen">
            Changer de moyen de paiement
          </UiBaseButton>
          <UiBaseButton
            v-if="echec.action === 'contacter' || tentatives >= 2"
            taille="sm"
            variante="whatsapp"
            :href="lienWhatsApp(`Bonjour, mon paiement pour le module « ${achat.module?.titre ?? ''} » a échoué (${echec.titre}).`)"
          >
            Contacter l’équipe
          </UiBaseButton>
        </div>
      </div>

      <div class="mt-8 grid gap-3 sm:grid-cols-2">
        <label
          v-for="moyen in moyens"
          :key="moyen.valeur"
          class="flex cursor-pointer items-start gap-3 rounded-[14px] border p-5"
          :class="achat.moyen === moyen.valeur ? 'border-social' : 'border-ligne'"
        >
          <input v-model="achat.moyen" type="radio" :value="moyen.valeur" class="mt-1">
          <span>
            <span class="block font-title text-[19px] font-light">{{ moyen.libelle }}</span>
            <span class="block text-[13.5px] text-discret">{{ moyen.detail }}</span>
          </span>
        </label>
      </div>

      <UiBaseButton class="mt-7 w-full" taille="lg" @click="payer">
        {{ etat === 'echec' ? 'Réessayer le paiement' : `Payer ${achat.module ? formatFcfa(achat.module.prixFcfa, true) : ''}` }}
      </UiBaseButton>
      <p class="mt-3 text-center text-[13px] text-discret">
        Le règlement est traité par FeexPay. L’interface de paiement est fournie par le prestataire.
      </p>

      <label v-if="dev" class="mt-6 block rounded-[10px] border border-dashed border-ligne p-3 text-[12.5px] text-discret">
        <span class="font-bold text-texte">Développement — simuler un échec :</span>
        <select v-model="simulerEchec" class="ml-2 rounded border border-ligne bg-white px-2 py-1 text-[12.5px]">
          <option value="">aucun (paiement réussi)</option>
          <option v-for="(e, code) in ECHECS_PAIEMENT" :key="code" :value="code">{{ e.titre }}</option>
        </select>
      </label>
    </template>

    <div v-else-if="etat === 'attente' || etat === 'verification'" class="mt-10 rounded-carte border border-ligne-douce p-10 text-center">
      <p class="font-title text-[24px] font-light">
        {{ etat === 'attente' ? 'En attente de validation' : 'Vérification du paiement' }}
      </p>
      <p class="mt-3 text-[15px] text-texte">{{ message || 'Merci de patienter quelques instants.' }}</p>
    </div>

    <div v-else class="mt-10 rounded-carte border border-succes bg-succes-voile p-10 text-center">
      <p class="font-title text-[27px] font-light text-succes">Paiement confirmé</p>
      <p class="mt-3 text-[15px] text-texte">
        Votre module est maintenant accessible à vie depuis votre espace apprenant.
      </p>
      <p v-if="achat.reference" class="mt-2 font-mono text-[13px] text-discret">
        Référence {{ achat.reference }}
      </p>
      <UiBaseButton
        :to="`/mon-espace/module/${achat.module?.slug}`"
        class="mt-6"
        taille="lg"
        @click="achat.vider()"
      >
        Accéder à mon module
      </UiBaseButton>
    </div>
  </div>
</template>
