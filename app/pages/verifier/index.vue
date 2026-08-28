<script setup lang="ts">
// Saisie manuelle d'un numéro d'attestation — pour les cas où le QR code est
// illisible ou que l'on ne dispose que du numéro par écrit. La vérification
// elle-même est portée par /verifier/[numero], cible du QR.
usePagePrivee('Vérifier une attestation')

const numero = ref('')

/** Le numéro imprimé peut être recopié avec des espaces ou en minuscules :
 *  on normalise vers la forme EMBF-XXX-AAAA-###### avant de naviguer. */
const numeroNormalise = computed(() => numero.value.replace(/\s+/g, '').toUpperCase())

function verifier() {
  if (numeroNormalise.value) navigateTo(`/verifier/${numeroNormalise.value}`)
}
</script>

<template>
  <div class="conteneur max-w-[640px] py-14">
    <h1 class="text-[34px] font-medium">Vérifier une attestation</h1>
    <p class="mt-3 text-[15px] leading-relaxed text-texte">
      Chaque attestation E-Masterclass Big Five porte un numéro unique et un QR code. Scannez le QR
      code, ou saisissez le numéro ci-dessous pour contrôler son authenticité.
    </p>

    <form class="mt-8 rounded-carte border border-ligne-douce bg-white p-8" @submit.prevent="verifier">
      <label class="block">
        <span class="mb-1.5 block text-[14px] font-bold">Numéro de l’attestation</span>
        <input
          v-model="numero"
          required
          placeholder="EMBF-ENT-2026-000128"
          autocomplete="off"
          spellcheck="false"
          class="w-full rounded-[10px] border border-ligne px-4 py-2.5 font-mono text-[15px] uppercase focus:border-social focus:outline-none"
        >
      </label>
      <p class="mt-2 text-[12.5px] text-discret">
        Le numéro figure en bas de l’attestation, sous la forme EMBF-XXX-AAAA-000000.
      </p>
      <UiBaseButton type="submit" class="mt-5">Vérifier l’authenticité</UiBaseButton>
    </form>

    <p class="mt-6 text-[13px] text-discret">
      Une question sur une attestation ? Écrivez-nous sur WhatsApp au {{ WHATSAPP.affichage }}.
    </p>
  </div>
</template>
