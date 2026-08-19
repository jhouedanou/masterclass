<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const achat = useAchatStore()

const moyens = [
  { valeur: 'mobile-money', libelle: 'Mobile Money', detail: 'Orange, MTN, Moov' },
  { valeur: 'wave', libelle: 'Wave', detail: 'Paiement par QR ou numéro' },
  { valeur: 'djamo', libelle: 'Djamo', detail: 'Carte et compte Djamo' },
  { valeur: 'visa', libelle: 'Visa', detail: 'Carte bancaire internationale' },
] as const

const etat = ref<'choix' | 'attente' | 'verification' | 'succes' | 'echec'>('choix')
const message = ref('')

usePagePrivee('Choisissez votre moyen de paiement')

async function payer() {
  if (!achat.module) return
  etat.value = 'attente'
  message.value = 'Validez la demande sur votre téléphone.'
  try {
    etat.value = 'verification'
    const commande = await $fetch<{ reference: string }>('/api/commandes', {
      method: 'POST',
      body: { moduleIds: [achat.module.id], moyen: achat.moyen },
    })
    achat.reference = commande.reference
    etat.value = 'succes'
  } catch (e) {
    etat.value = 'echec'
    message.value = (e as { statusMessage?: string }).statusMessage ?? 'Le paiement a échoué.'
  }
}
</script>

<template>
  <div class="conteneur max-w-[840px] py-12">
    <UiEtapesAchat :etape="3" />

    <h1 class="mt-8 text-[36px] font-medium">Choisissez votre moyen de paiement</h1>

    <template v-if="etat === 'choix' || etat === 'echec'">
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

      <p v-if="etat === 'echec'" class="mt-5 rounded-[12px] border border-erreur bg-[#fdeeee] p-4 text-[14px] text-erreur-fonce">
        {{ message }} Vous pouvez réessayer ou changer de moyen de paiement.
      </p>

      <UiBaseButton class="mt-7 w-full" taille="lg" @click="payer">
        {{ etat === 'echec' ? 'Réessayer le paiement' : `Payer ${achat.module ? formatFcfa(achat.module.prixFcfa, true) : ''}` }}
      </UiBaseButton>
      <p class="mt-3 text-center text-[13px] text-discret">
        Le règlement est traité par FeexPay. L’interface de paiement est fournie par le prestataire.
      </p>
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
