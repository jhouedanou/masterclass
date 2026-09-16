<script setup lang="ts">
const auth = useAuthStore()

/** Pays proposés par la maquette (planche A, écran 04) ; « Autre pays… » ouvre une saisie libre. */
const PAYS = ['Côte d’Ivoire', 'Bénin', 'Burkina Faso', 'Sénégal', 'Autre pays…']

const formulaire = reactive({
  nom: '',
  prenom: '',
  email: '',
  whatsapp: '',
  pays: 'Côte d’Ivoire',
  autrePays: '',
  motDePasse: '',
  confirmation: '',
})

/** Même seuil que le serveur (`server/utils/motDePasse.ts`). */
const LONGUEUR_MINIMALE = 10
const CHAMP = 'w-full rounded-[10px] border-[1.5px] border-ligne px-3.5 py-[13px] text-[14px] focus:border-social focus:outline-none'
const ETIQUETTE = 'mb-1.5 block text-[13px] font-bold text-encre'
const AIDE = 'mt-1.5 block text-[12px] text-discret'
const erreur = ref('')
const enCours = ref(false)

usePagePrivee('Créez votre compte')

// L'achat en cours doit survivre à la connexion : on le laisse dans le store.
onMounted(() => {
  if (auth.estConnecte) navigateTo('/achat/recapitulatif')
})

async function soumettre() {
  erreur.value = ''
  if (formulaire.motDePasse !== formulaire.confirmation) {
    erreur.value = 'Les deux mots de passe ne correspondent pas.'
    return
  }
  enCours.value = true
  try {
    await auth.inscription({
      prenom: formulaire.prenom,
      nom: formulaire.nom,
      email: formulaire.email,
      motDePasse: formulaire.motDePasse,
      // Le préfixe +225 est affiché devant le champ ; il est ajouté si l'apprenant ne l'a pas saisi.
      whatsapp: formulaire.whatsapp.startsWith('+') ? formulaire.whatsapp : `+225 ${formulaire.whatsapp}`,
      pays: formulaire.pays === 'Autre pays…' ? formulaire.autrePays.trim() || 'Autre' : formulaire.pays,
    })
    await navigateTo('/achat/recapitulatif')
  } catch (e) {
    const r = e as { statusMessage?: string; data?: { statusMessage?: string } }
    erreur.value = r.data?.statusMessage ?? r.statusMessage ?? 'La création du compte a échoué.'
  } finally {
    enCours.value = false
  }
}
</script>

<template>
  <!-- Colonne étroite et centrée : le tunnel n'affiche rien d'autre que l'étape en cours. -->
  <div class="mx-auto w-full max-w-[440px] px-5 py-9">
    <UiEtapesAchat :etape="1" />

    <h1 class="mt-2.5 mb-1.5 text-center font-title text-[24px] font-light">Créez votre compte</h1>
    <p class="mb-6 text-center text-[13.5px] leading-[1.5] text-discret">
      Votre compte vous permettra de finaliser votre achat, d’accéder à vos modules et de suivre vos
      prochaines sessions.
    </p>

    <form class="flex flex-col gap-3.5" @submit.prevent="soumettre">
      <div class="grid grid-cols-2 gap-2.5">
        <label class="block">
          <span :class="ETIQUETTE">Nom *</span>
          <input v-model="formulaire.nom" required autocomplete="family-name" placeholder="Votre nom" :class="CHAMP">
        </label>
        <label class="block">
          <span :class="ETIQUETTE">Prénom *</span>
          <input v-model="formulaire.prenom" required autocomplete="given-name" placeholder="Votre prénom" :class="CHAMP">
        </label>
      </div>
      <label class="block">
        <span :class="ETIQUETTE">Adresse email *</span>
        <input
          v-model="formulaire.email"
          required
          type="email"
          autocomplete="email"
          placeholder="Votre identifiant de connexion"
          :class="CHAMP"
        >
      </label>
      <label class="block">
        <span :class="ETIQUETTE">Numéro WhatsApp *</span>
        <span class="flex gap-2">
          <span class="rounded-[10px] border-[1.5px] border-ligne px-3 py-[13px] text-[14px] text-texte">+225</span>
          <input
            v-model="formulaire.whatsapp"
            required
            type="tel"
            inputmode="tel"
            autocomplete="tel-national"
            placeholder="07 00 00 00 00"
            :class="CHAMP"
          >
        </span>
        <span :class="AIDE">Pour vos rappels de session et l’accès à la Communauté.</span>
      </label>
      <label class="block">
        <!-- Le pays est saisi ici et n'est plus redemandé dans la fiche apprenant. -->
        <span :class="ETIQUETTE">Pays *</span>
        <select v-model="formulaire.pays" required :class="[CHAMP, 'bg-white text-texte']">
          <option v-for="pays in PAYS" :key="pays" :value="pays">{{ pays }}</option>
        </select>
        <input
          v-if="formulaire.pays === 'Autre pays…'"
          v-model="formulaire.autrePays"
          required
          placeholder="Précisez le pays"
          :class="[CHAMP, 'mt-2']"
        >
        <span :class="AIDE">Renseigné une seule fois, il n’est plus demandé ensuite.</span>
      </label>
      <label class="block">
        <span :class="ETIQUETTE">Mot de passe *</span>
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
      <label class="block">
        <span :class="ETIQUETTE">Confirmez le mot de passe *</span>
        <input
          v-model="formulaire.confirmation"
          type="password"
          autocomplete="new-password"
          required
          :minlength="LONGUEUR_MINIMALE"
          placeholder="Identique au mot de passe"
          :class="CHAMP"
        >
      </label>

      <p v-if="erreur" class="rounded-[12px] border border-erreur-bordure bg-erreur-voile px-4 py-3.5 text-[13px] leading-[1.5] text-erreur-fonce" role="alert">
        {{ erreur }}
      </p>
      <UiBaseButton type="submit" class="w-full" variante="sombre" taille="lg" :disabled="enCours">
        {{ enCours ? 'Création…' : 'Créer mon compte et continuer' }}
      </UiBaseButton>
      <p class="text-center text-[13px] text-discret">
        Déjà inscrit ?
        <NuxtLink to="/connexion?suite=/achat/recapitulatif" class="font-bold">Connectez-vous</NuxtLink>
      </p>
    </form>
  </div>
</template>

