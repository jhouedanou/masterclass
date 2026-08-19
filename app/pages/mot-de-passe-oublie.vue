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
    <h1 class="text-[34px] font-medium">Mot de passe oublié</h1>
    <p class="mt-2 text-[15px] text-texte">
      Nous vous envoyons un lien de réinitialisation, valable 30 minutes.
    </p>

    <form v-if="!envoye" class="mt-8 space-y-4" @submit.prevent="soumettre">
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Adresse e-mail</span>
        <input v-model="email" type="email" required class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
      </label>
      <UiBaseButton type="submit" class="w-full" taille="lg">Envoyer le lien</UiBaseButton>
    </form>

    <p v-else class="mt-8 rounded-[12px] border border-succes bg-succes-voile p-4 text-[14.5px] text-succes">
      Si un compte existe avec cette adresse, un lien de réinitialisation vient d’être envoyé. Il
      reste valable 30 minutes.
    </p>

    <NuxtLink to="/connexion" class="mt-6 inline-block text-[14px] text-discret hover:underline">
      Retour à la connexion
    </NuxtLink>
  </div>
</template>
