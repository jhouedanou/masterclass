<script setup lang="ts">
import type { Certificat } from '#shared/types'

const route = useRoute()
const { data, error } = await useFetch<{ certificat: Certificat; lienVerification: string }>(
  () => `/api/certificats/${route.params.numero}`,
)

// Page de destination du QR code : accessible sans compte, mais hors index.
usePagePrivee('Vérification de certificat')
</script>

<template>
  <div class="conteneur max-w-[640px] py-14">
    <h1 class="text-[34px] font-medium">Vérification de certificat</h1>
    <p class="mt-2 text-[14px] text-discret">
      Numéro recherché : <span class="font-mono">{{ route.params.numero }}</span>
    </p>

    <div v-if="data" class="mt-8 rounded-carte border border-succes p-8">
      <p class="inline-flex items-center gap-2 rounded-full bg-succes-voile px-3.5 py-1.5 text-[14px] text-succes">
        <Icon name="ph:seal-check-fill" size="18" />
        Certificat authentique
      </p>

      <dl class="mt-6 space-y-3 text-[14px]">
        <div class="flex justify-between gap-4"><dt class="text-discret">Titulaire</dt><dd class="text-right font-bold">{{ data.certificat.prenomNom }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-discret">Module</dt><dd class="text-right">{{ data.certificat.titreModule }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-discret">Programme</dt><dd class="text-right">{{ data.certificat.programme }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-discret">Thématique</dt><dd class="text-right">{{ data.certificat.thematique }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-discret">Formateur</dt><dd class="text-right">{{ data.certificat.formateur }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-discret">Délivré le</dt><dd class="text-right">{{ formatDate(data.certificat.dateDelivrance) }}</dd></div>
      </dl>

      <p class="mt-6 border-t border-ligne-claire pt-4 text-[12px] text-discret">
        Cette attestation confirme le suivi du module et ne constitue ni un diplôme ni une
        certification professionnelle.
      </p>
    </div>

    <div v-else-if="error" class="mt-8 rounded-carte border border-erreur bg-[#fdeeee] p-8">
      <p class="font-title text-[21px] font-light text-erreur-fonce">
        Aucun certificat ne correspond à ce numéro.
      </p>
      <p class="mt-2 text-[14px] text-erreur">
        Vérifiez la saisie, ou contactez-nous sur WhatsApp au {{ WHATSAPP.affichage }}.
      </p>
    </div>

    <UiBaseButton to="/" variante="contour" class="mt-8">Retour à l’accueil</UiBaseButton>
  </div>
</template>
