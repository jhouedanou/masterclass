<script setup lang="ts">
definePageMeta({ layout: 'auth' })

// Cible du lien de réinitialisation, valable 30 minutes (spec §8).
const route = useRoute()
const auth = useAuthStore()

const jeton = computed(() => String(route.query.jeton ?? ''))
const motDePasse = ref('')
const confirmation = ref('')
const erreur = ref('')
const enCours = ref(false)

/** Même seuil que le serveur (`server/utils/motDePasse.ts`). */
const LONGUEUR_MINIMALE = 10

usePagePrivee('Nouveau mot de passe')

async function soumettre() {
  erreur.value = ''

  if (motDePasse.value !== confirmation.value) {
    erreur.value = 'Les deux mots de passe ne correspondent pas.'
    return
  }

  enCours.value = true
  try {
    await $fetch('/api/auth/reinitialiser', {
      method: 'POST',
      body: { jeton: jeton.value, motDePasse: motDePasse.value },
    })
    // Le serveur ouvre la session dans la foulée : inutile de repasser par la
    // page de connexion.
    await auth.rafraichir()
    await navigateTo('/mon-espace')
  } catch (e) {
    erreur.value =
      (e as { statusMessage?: string }).statusMessage ?? 'La réinitialisation a échoué.'
  } finally {
    enCours.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-[34px] font-medium">Nouveau mot de passe</h1>

    <div v-if="!jeton" class="mt-6 rounded-[10px] border border-erreur bg-[#fdeeee] p-5">
      <p class="text-[14px] text-erreur">
        Ce lien est incomplet. Demandez un nouveau lien depuis
        <NuxtLink to="/mot-de-passe-oublie" class="underline">mot de passe oublié</NuxtLink>.
      </p>
    </div>

    <template v-else>
      <p class="mt-2 text-[15px] text-texte">
        Choisissez un nouveau mot de passe. Vous serez connecté immédiatement.
      </p>

      <form class="mt-8 space-y-4" @submit.prevent="soumettre">
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Nouveau mot de passe</span>
          <input
            v-model="motDePasse"
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

        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Confirmation</span>
          <input
            v-model="confirmation"
            type="password"
            autocomplete="new-password"
            required
            class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none"
          >
        </label>

        <p v-if="erreur" class="text-[14px] text-erreur">{{ erreur }}</p>

        <UiBaseButton type="submit" class="w-full" taille="lg" :disabled="enCours">
          {{ enCours ? 'Enregistrement…' : 'Définir mon mot de passe' }}
        </UiBaseButton>
      </form>
    </template>

    <p class="mt-6 text-[14px]">
      <NuxtLink to="/connexion" class="font-bold">Retour à la connexion</NuxtLink>
    </p>
  </div>
</template>
