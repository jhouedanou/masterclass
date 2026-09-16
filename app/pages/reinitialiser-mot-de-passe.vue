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
/** « ✓ Mot de passe mis à jour. Vous êtes maintenant connecté sur cet appareil. » */
const termine = ref(false)

/** Même seuil que le serveur (`server/utils/motDePasse.ts`). */
const LONGUEUR_MINIMALE = 10

const CHAMP = 'w-full rounded-[10px] border-[1.5px] border-ligne px-3.5 py-[13px] text-[14px] focus:border-social focus:outline-none'
const ETIQUETTE = 'mb-1.5 block text-[13px] font-bold text-encre'

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
    termine.value = true
    setTimeout(() => navigateTo('/mon-espace'), 1800)
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
    <h1 class="mb-1.5 text-center font-title text-[24px] font-light">Nouveau mot de passe</h1>

    <p v-if="!jeton" class="rounded-[12px] border border-erreur-bordure bg-erreur-voile px-4 py-3.5 text-[13px] leading-[1.5] text-erreur-fonce">
      Ce lien est incomplet. Demandez un nouveau lien depuis
      <NuxtLink to="/mot-de-passe-oublie" class="font-bold underline">mot de passe oublié</NuxtLink>.
    </p>

    <template v-else>
      <p class="mb-5.5 text-center text-[13.5px] text-discret">
        Choisissez un mot de passe de {{ LONGUEUR_MINIMALE }} caractères minimum.
      </p>

      <form class="flex flex-col gap-3.5" @submit.prevent="soumettre">
        <template v-if="!termine">
          <label class="block">
            <span :class="ETIQUETTE">Nouveau mot de passe</span>
            <input
              v-model="motDePasse"
              type="password"
              autocomplete="new-password"
              required
              :minlength="LONGUEUR_MINIMALE"
              :placeholder="`${LONGUEUR_MINIMALE} caractères minimum`"
              :class="CHAMP"
            >
          </label>

          <label class="block">
            <span :class="ETIQUETTE">Confirmez le mot de passe</span>
            <input
              v-model="confirmation"
              type="password"
              autocomplete="new-password"
              required
              placeholder="Identique au précédent"
              :class="CHAMP"
            >
          </label>

          <p v-if="erreur" class="rounded-[12px] border border-erreur-bordure bg-erreur-voile px-4 py-3.5 text-[13px] leading-[1.5] text-erreur-fonce">
            {{ erreur }}
          </p>

          <UiBaseButton type="submit" class="w-full" variante="sombre" taille="lg" :disabled="enCours">
            {{ enCours ? 'Enregistrement…' : 'Enregistrer et me connecter' }}
          </UiBaseButton>
        </template>

        <p v-else class="rounded-[12px] border border-succes-bordure bg-succes-voile px-4 py-3.5 text-[13px] leading-[1.5] text-succes-fonce" role="status">
          ✓ Mot de passe mis à jour. Vous êtes maintenant connecté sur cet appareil.
        </p>
      </form>
    </template>

    <p class="mt-3.5 text-center text-[13px] text-discret">
      <NuxtLink to="/connexion" class="font-bold">← Retour à la connexion</NuxtLink>
    </p>
  </div>
</template>
