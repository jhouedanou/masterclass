<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const auth = useAuthStore()
const formulaire = reactive({
  prenom: '',
  nom: '',
  email: '',
  motDePasse: '',
  whatsapp: '',
  pays: 'Côte d’Ivoire',
})

/** Même seuil que le serveur (`server/utils/motDePasse.ts`) : l'écran le dit
 *  avant l'envoi plutôt que d'attendre le refus. */
const LONGUEUR_MINIMALE = 10
const erreur = ref('')
const enCours = ref(false)

usePagePrivee('Créer un compte')

async function soumettre() {
  erreur.value = ''
  enCours.value = true
  try {
    await auth.inscription(formulaire)
    await navigateTo('/mon-espace')
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'La création du compte a échoué.'
  } finally {
    enCours.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-[34px] font-medium">Créez votre compte</h1>
    <p class="mt-2 text-[15px] text-texte">
      Votre compte vous permettra d’accéder à vos modules et de suivre vos prochaines sessions.
    </p>

    <form class="mt-8 grid gap-4 sm:grid-cols-2" @submit.prevent="soumettre">
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Prénom</span>
        <input v-model="formulaire.prenom" required class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Nom</span>
        <input v-model="formulaire.nom" required class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
      </label>
      <label class="block sm:col-span-2">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Adresse e-mail</span>
        <input v-model="formulaire.email" type="email" autocomplete="email" required class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Numéro WhatsApp</span>
        <input v-model="formulaire.whatsapp" type="tel" class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Pays</span>
        <input v-model="formulaire.pays" class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
      </label>
      <label class="block sm:col-span-2">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Mot de passe</span>
        <input
          v-model="formulaire.motDePasse"
          type="password"
          autocomplete="new-password"
          required
          :minlength="LONGUEUR_MINIMALE"
          class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none"
        >
        <span class="mt-1.5 block text-[12.5px] text-discret">
          {{ LONGUEUR_MINIMALE }} caractères minimum.
        </span>
      </label>

      <div class="sm:col-span-2">
        <p v-if="erreur" class="mb-3 text-[14px] text-erreur">{{ erreur }}</p>
        <UiBaseButton type="submit" class="w-full" taille="lg" :disabled="enCours">
          {{ enCours ? 'Création…' : 'Créer mon compte' }}
        </UiBaseButton>
      </div>
    </form>

    <p class="mt-6 text-[14px]">
      Déjà inscrit ? <NuxtLink to="/connexion" class="font-bold">Se connecter</NuxtLink>
    </p>
  </div>
</template>
