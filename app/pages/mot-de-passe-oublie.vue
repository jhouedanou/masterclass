<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const email = ref('')
const envoye = ref(false)

usePagePrivee('Mot de passe oublié')

async function soumettre() {
  await $fetch('/api/auth/mot-de-passe-oublie', { method: 'POST', body: { email: email.value } })
  envoye.value = true
}
</script>

<template>
  <div>
    <h1 class="mb-1.5 text-center font-title text-[24px] font-light">Mot de passe oublié</h1>
    <p class="mb-5.5 text-center text-[13.5px] text-discret">
      Recevez un lien de réinitialisation valable 30 minutes.
    </p>

    <!-- Le formulaire reste offert après l'envoi : un lien peut se perdre. -->
    <form class="flex flex-col gap-3.5" @submit.prevent="soumettre">
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-encre">Adresse email</span>
        <input
          v-model="email"
          type="email"
          required
          placeholder="Celle de votre compte"
          class="w-full rounded-[10px] border-[1.5px] border-ligne px-3.5 py-[13px] text-[14px] focus:border-social focus:outline-none"
        >
      </label>
      <UiBaseButton type="submit" class="w-full" variante="sombre" taille="lg">Envoyer le lien</UiBaseButton>

      <p v-if="envoye" class="rounded-[12px] border border-succes-bordure bg-succes-voile px-4 py-3.5 text-[13px] leading-[1.5] text-succes-fonce" role="status">
        ✓ Si un compte existe pour cette adresse, le lien vient d’être envoyé. Pensez à vérifier vos
        spams.
      </p>

      <p class="text-center text-[13px] text-discret">
        <NuxtLink to="/connexion" class="font-bold">← Retour à la connexion</NuxtLink>
      </p>
    </form>
  </div>
</template>
