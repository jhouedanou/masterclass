<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const achat = useAchatStore()
const conditions = ref(false)

usePagePrivee('Vérifiez votre achat')
</script>

<template>
  <div class="conteneur max-w-[840px] py-12">
    <UiEtapesAchat :etape="2" />

    <h1 class="mt-8 text-[36px] font-medium">Vérifiez votre achat</h1>

    <div v-if="achat.module" class="mt-8 overflow-hidden rounded-carte border border-ligne-douce">
      <div class="p-6">
        <h2 class="font-title text-[24px] font-light">{{ achat.module.titre }}</h2>
        <dl class="mt-5 grid gap-3 text-[14px] sm:grid-cols-2">
          <div class="flex justify-between gap-4"><dt class="text-discret">Programme</dt><dd>{{ achat.module.programme }}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-discret">Thématique</dt><dd>{{ achat.module.thematique }}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-discret">Formateur</dt><dd>{{ achat.module.formateur }}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-discret">Durée</dt><dd>{{ formatDuree(achat.module.dureeMinutes) }}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-discret">Accès</dt><dd>À vie</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-discret">Coaching</dt><dd>Collectif, lié à la thématique</dd></div>
        </dl>
      </div>

      <div class="flex items-center justify-between border-t border-ligne-claire bg-fond-clair px-6 py-5">
        <span class="font-title text-[19px] font-light">Total</span>
        <span class="font-title text-[27px] font-light">
          {{ formatFcfa(achat.module.prixFcfa, true) }}
        </span>
      </div>
    </div>

    <label class="mt-6 flex items-start gap-3 text-[14px] leading-relaxed text-texte">
      <input v-model="conditions" type="checkbox" class="mt-1" required>
      <span>
        J’accepte les <NuxtLink to="/cgv" class="font-bold">conditions générales de vente</NuxtLink>
        et je reconnais que le module est un contenu numérique accessible immédiatement après
        paiement.
      </span>
    </label>

    <UiBaseButton
      to="/achat/paiement"
      class="mt-6 w-full"
      taille="lg"
      :class="!conditions && 'pointer-events-none opacity-50'"
    >
      Confirmer et passer au paiement
    </UiBaseButton>
    <p class="mt-3 text-center text-[13px] text-discret">
      Vous serez redirigé vers FeexPay pour régler votre commande.
    </p>
  </div>
</template>
