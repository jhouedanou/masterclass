<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const auth = useAuthStore()
const route = useRoute()

const email = ref('')
const motDePasse = ref('')
const erreur = ref('')
const enCours = ref(false)

usePagePrivee('Connexion')

async function soumettre() {
  erreur.value = ''
  enCours.value = true
  try {
    await auth.connexion(email.value, motDePasse.value)
    // L'achat en cours est conservé : on revient là où l'utilisateur s'était arrêté.
    await navigateTo(String(route.query.suite ?? '/mon-espace'))
  } catch (e) {
    // Le serveur distingue mot de passe erroné, compte verrouillé et champ
    // manquant : son message est déjà rédigé pour l'utilisateur.
    erreur.value =
      (e as { statusMessage?: string }).statusMessage ??
      'Adresse e-mail ou mot de passe incorrect.'
  } finally {
    enCours.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-[34px] font-medium">Connexion</h1>
    <p class="mt-2 text-[15px] text-texte">
      Accédez à vos modules, vos sessions de coaching et vos certificats de participation.
    </p>

    <form class="mt-8 space-y-4" @submit.prevent="soumettre">
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Adresse e-mail</span>
        <input v-model="email" type="email" autocomplete="email" required class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Mot de passe</span>
        <input v-model="motDePasse" type="password" autocomplete="current-password" required class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
      </label>

      <p v-if="erreur" class="text-[14px] text-erreur">{{ erreur }}</p>

      <UiBaseButton type="submit" class="w-full" taille="lg" :disabled="enCours">
        {{ enCours ? 'Connexion…' : 'Me connecter' }}
      </UiBaseButton>
    </form>

    <div class="mt-6 flex items-center justify-between text-[14px]">
      <NuxtLink to="/mot-de-passe-oublie" class="text-discret hover:underline">
        Mot de passe oublié ?
      </NuxtLink>
      <NuxtLink to="/inscription" class="font-bold">Créer un compte</NuxtLink>
    </div>

    <div class="mt-10 rounded-[10px] border border-dashed border-ligne p-4 text-[12.5px] text-discret">
      <p class="font-bold text-texte">Comptes de démonstration</p>
      <p class="mt-1">Apprenante : aya@example.ci · Administration : admin@bigfive.ci</p>
      <p>Formateur : formateur@bigfive.ci · Éditeur : editeur@bigfive.ci</p>
      <p class="mt-1">
        Mot de passe commun : <span class="font-mono">Masterclass2026!</span> — à changer avant
        toute mise en ligne.
      </p>
    </div>
  </div>
</template>
