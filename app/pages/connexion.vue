<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const auth = useAuthStore()
const route = useRoute()

const email = ref('')
const motDePasse = ref('')
const resterConnecte = ref(false)
/** Affichage en clair du mot de passe, sur demande explicite. Toujours masqué
 *  au chargement : l'écran peut être ouvert devant quelqu'un. */
const motDePasseVisible = ref(false)
const erreur = ref('')
/** « Il vous reste N tentatives avant verrouillage temporaire du compte (15 min). » */
const tentativesRestantes = ref<number | null>(null)
const enCours = ref(false)

usePagePrivee('Connexion')

async function soumettre() {
  erreur.value = ''
  enCours.value = true
  tentativesRestantes.value = null
  try {
    const { reactivable } = await auth.connexion(email.value, motDePasse.value, resterConnecte.value)
    // Suppression programmée : l'écran « Bon retour » propose de la réactiver.
    if (reactivable) {
      await navigateTo('/mon-espace?bon-retour=1')
      return
    }
    // L'achat en cours est conservé : on revient là où l'utilisateur s'était arrêté.
    await navigateTo(String(route.query.suite ?? '/mon-espace'))
  } catch (e) {
    // Le serveur distingue mot de passe erroné, compte verrouillé et champ
    // manquant : son message est déjà rédigé pour l'utilisateur.
    // L'erreur de $fetch porte le corps de la réponse dans `data` : la
    // redirection posée par le serveur (compte admin) est donc dans data.data.
    const reponse = e as {
      statusMessage?: string
      data?: { statusMessage?: string; data?: { redirection?: string; tentativesRestantes?: number } }
    }
    if (typeof reponse.data?.data?.tentativesRestantes === 'number') {
      tentativesRestantes.value = reponse.data.data.tentativesRestantes
    }
    const redirection = reponse.data?.data?.redirection
    if (redirection) {
      await navigateTo(`${redirection}?suite=${encodeURIComponent(String(route.query.suite ?? '/admin'))}`)
      return
    }
    erreur.value =
      reponse.data?.statusMessage ?? reponse.statusMessage ?? 'Adresse e-mail ou mot de passe incorrect.'
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
      <div v-if="erreur" class="rounded-[10px] border border-erreur bg-[#fdeeee] px-4 py-3 text-[14px] text-erreur" role="alert">
        {{ erreur }}
        <template v-if="tentativesRestantes !== null">
          Il vous reste <b>{{ tentativesRestantes }} {{ tentativesRestantes > 1 ? 'tentatives' : 'tentative' }}</b>
          avant verrouillage temporaire du compte (15 min).
        </template>
      </div>

      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Adresse email</span>
        <input v-model="email" type="email" autocomplete="email" required class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Mot de passe</span>
        <div class="relative">
          <!-- `type` lié plutôt que deux champs alternés : un seul champ garde
               la valeur, le curseur et le remplissage du gestionnaire. -->
          <input
            v-model="motDePasse"
            :type="motDePasseVisible ? 'text' : 'password'"
            autocomplete="current-password"
            required
            class="w-full rounded-[10px] border border-ligne py-2.5 pr-12 pl-4 text-[15px] focus:border-social focus:outline-none"
          >
          <button
            type="button"
            class="absolute inset-y-0 right-0 grid w-12 place-items-center text-discret transition hover:text-encre"
            :aria-label="motDePasseVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
            :aria-pressed="motDePasseVisible"
            @click="motDePasseVisible = !motDePasseVisible"
          >
            <Icon :name="motDePasseVisible ? 'ph:eye-slash' : 'ph:eye'" size="20" />
          </button>
        </div>
      </label>

      <div class="flex items-center justify-between text-[14px]">
        <label class="flex items-center gap-2 text-texte">
          <input v-model="resterConnecte" type="checkbox">
          Rester connecté
        </label>
        <NuxtLink to="/mot-de-passe-oublie" class="text-discret hover:underline">
          Mot de passe oublié ?
        </NuxtLink>
      </div>

      <UiBaseButton type="submit" class="w-full" taille="lg" :disabled="enCours">
        {{ enCours ? 'Connexion…' : 'Me connecter' }}
      </UiBaseButton>
    </form>

    <p class="mt-6 text-center text-[14px] text-texte">
      Pas encore de compte ?
      <NuxtLink to="/inscription" class="font-bold">Créez-en un</NuxtLink>
    </p>

  </div>
</template>
