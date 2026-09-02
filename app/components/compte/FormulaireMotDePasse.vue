<script setup lang="ts">
/** Changement de mot de passe d'un compte connecté — partagé par l'apprenant,
 *  le formateur et l'administrateur. */
const actuel = ref('')
const nouveau = ref('')
const confirmation = ref('')
const message = ref('')
const erreur = ref('')
const envoi = ref(false)

const MINIMUM = 10

async function envoyer() {
  erreur.value = ''
  message.value = ''
  if (nouveau.value.length < MINIMUM) {
    erreur.value = `Le nouveau mot de passe doit contenir au moins ${MINIMUM} caractères.`
    return
  }
  if (nouveau.value !== confirmation.value) {
    erreur.value = 'La confirmation ne correspond pas.'
    return
  }
  envoi.value = true
  try {
    await $fetch('/api/mon-espace/compte/mot-de-passe', {
      method: 'PUT',
      body: { actuel: actuel.value, nouveau: nouveau.value },
    })
    message.value = 'Mot de passe modifié.'
    actuel.value = nouveau.value = confirmation.value = ''
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Modification impossible.'
  } finally {
    envoi.value = false
  }
}
</script>

<template>
  <form class="grid gap-4 sm:grid-cols-3" @submit.prevent="envoyer">
    <label class="block sm:col-span-3">
      <span class="mb-1.5 block text-[13px] font-bold text-texte">Mot de passe actuel</span>
      <input v-model="actuel" type="password" autocomplete="current-password" required class="w-full max-w-sm rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
    </label>
    <label class="block">
      <span class="mb-1.5 block text-[13px] font-bold text-texte">Nouveau mot de passe</span>
      <input v-model="nouveau" type="password" autocomplete="new-password" :minlength="MINIMUM" required class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
    </label>
    <label class="block">
      <span class="mb-1.5 block text-[13px] font-bold text-texte">Confirmation</span>
      <input v-model="confirmation" type="password" autocomplete="new-password" required class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
    </label>
    <div class="flex items-end">
      <UiBaseButton type="submit" taille="sm" variante="sombre" :disabled="envoi">Modifier</UiBaseButton>
    </div>
    <p class="text-[12.5px] text-discret sm:col-span-3">{{ MINIMUM }} caractères minimum.</p>
    <p v-if="message" class="text-[14px] text-succes sm:col-span-3">{{ message }}</p>
    <p v-if="erreur" class="text-[14px] text-erreur sm:col-span-3">{{ erreur }}</p>
  </form>
</template>
