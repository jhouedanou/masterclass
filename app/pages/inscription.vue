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

const CHAMP = 'w-full rounded-[10px] border-[1.5px] border-ligne px-3.5 py-[13px] text-[14px] focus:border-social focus:outline-none'
const ETIQUETTE = 'mb-1.5 block text-[13px] font-bold text-encre'

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
    <h1 class="mb-1.5 text-center font-title text-[24px] font-light">Créez votre compte</h1>
    <p class="mb-5.5 text-center text-[13.5px] leading-[1.5] text-discret">
      Votre compte vous permettra d’accéder à vos modules et de suivre vos prochaines sessions.
    </p>

    <form class="flex flex-col gap-3.5" @submit.prevent="soumettre">
      <div class="grid grid-cols-2 gap-2.5">
        <label class="block">
          <span :class="ETIQUETTE">Nom</span>
          <input v-model="formulaire.nom" required autocomplete="family-name" placeholder="Votre nom" :class="CHAMP">
        </label>
        <label class="block">
          <span :class="ETIQUETTE">Prénom</span>
          <input v-model="formulaire.prenom" required autocomplete="given-name" placeholder="Votre prénom" :class="CHAMP">
        </label>
      </div>
      <label class="block">
        <span :class="ETIQUETTE">Adresse email</span>
        <input
          v-model="formulaire.email"
          type="email"
          autocomplete="email"
          required
          placeholder="Votre identifiant de connexion"
          :class="CHAMP"
        >
      </label>
      <label class="block">
        <span :class="ETIQUETTE">Numéro WhatsApp</span>
        <input v-model="formulaire.whatsapp" type="tel" placeholder="+225 07 00 00 00 00" :class="CHAMP">
        <span class="mt-1.5 block text-[12px] text-discret">
          Pour vos rappels de session et l’accès à la Communauté.
        </span>
      </label>
      <label class="block">
        <span :class="ETIQUETTE">Pays</span>
        <input v-model="formulaire.pays" :class="CHAMP">
      </label>
      <label class="block">
        <span :class="ETIQUETTE">Mot de passe</span>
        <input
          v-model="formulaire.motDePasse"
          type="password"
          autocomplete="new-password"
          required
          :minlength="LONGUEUR_MINIMALE"
          :placeholder="`${LONGUEUR_MINIMALE} caractères minimum`"
          :class="CHAMP"
        >
      </label>

      <p v-if="erreur" class="rounded-[12px] border border-erreur-bordure bg-erreur-voile px-4 py-3.5 text-[13px] leading-[1.5] text-erreur-fonce">
        {{ erreur }}
      </p>
      <UiBaseButton type="submit" class="w-full" variante="sombre" taille="lg" :disabled="enCours">
        {{ enCours ? 'Création…' : 'Créer mon compte' }}
      </UiBaseButton>

      <p class="text-center text-[13px] text-discret">
        Déjà inscrit ? <NuxtLink to="/connexion" class="font-bold">Connectez-vous</NuxtLink>
      </p>
    </form>
  </div>
</template>
