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

const CHAMP = 'w-full rounded-[10px] border-[1.5px] border-ligne px-3.5 py-[13px] text-[14px] focus:border-social focus:outline-none'
const ETIQUETTE = 'mb-1.5 block text-[13px] font-bold text-encre'

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
    // L'achat en cours est conservé : on revient là où l'utilisateur s'était
    // arrêté. À défaut, chacun rejoint son espace : un formateur n'a rien à
    // faire dans /mon-espace, qui ne montre que des modules achetés — il y
    // arrivait sur un tableau de bord vide et croyait son compte inopérant.
    const accueil = auth.utilisateur?.role === 'formateur' ? '/formateur' : '/mon-espace'
    await navigateTo(String(route.query.suite ?? accueil))
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
    <h1 class="mb-1.5 text-center font-title text-[24px] font-light">Connexion</h1>
    <p class="mb-5.5 text-center text-[13.5px] leading-[1.5] text-discret">
      Accédez à vos modules, vos sessions de coaching et vos certificats de participation.
    </p>

    <!-- L'avertissement coiffe le formulaire et rougit les deux champs refusés. -->
    <p v-if="erreur" class="mb-4 rounded-[12px] border border-erreur-bordure bg-erreur-voile px-4 py-3.5 text-[13px] leading-[1.5] text-erreur-fonce" role="alert">
      {{ erreur }}
      <template v-if="tentativesRestantes !== null">
        Il vous reste <b>{{ tentativesRestantes }} {{ tentativesRestantes > 1 ? 'tentatives' : 'tentative' }}</b>
        avant verrouillage temporaire du compte (15 min).
      </template>
    </p>

    <form class="flex flex-col gap-3.5" @submit.prevent="soumettre">
      <label class="block">
        <span :class="ETIQUETTE">Adresse email</span>
        <input v-model="email" type="email" autocomplete="email" required :class="[CHAMP, erreur && 'border-[#e0aab2]']">
      </label>
      <label class="block">
        <span :class="ETIQUETTE">Mot de passe</span>
        <div class="relative">
          <!-- `type` lié plutôt que deux champs alternés : un seul champ garde
               la valeur, le curseur et le remplissage du gestionnaire. -->
          <input
            v-model="motDePasse"
            :type="motDePasseVisible ? 'text' : 'password'"
            autocomplete="current-password"
            required
            :class="[CHAMP, 'pr-12', erreur && 'border-[#e0aab2]']"
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

      <div class="flex items-center justify-between text-[13px]">
        <label class="flex items-center gap-2 text-texte">
          <input v-model="resterConnecte" type="checkbox" class="size-4 accent-social">
          Rester connecté
        </label>
        <NuxtLink to="/mot-de-passe-oublie" class="font-bold">Mot de passe oublié ?</NuxtLink>
      </div>

      <UiBaseButton type="submit" class="w-full" variante="sombre" taille="lg" :disabled="enCours">
        {{ enCours ? 'Connexion…' : 'Me connecter' }}
      </UiBaseButton>

      <p class="text-center text-[13px] text-discret">
        Pas encore de compte ?
        <NuxtLink to="/inscription" class="font-bold">Créez-en un</NuxtLink>
      </p>
    </form>
  </div>
</template>
