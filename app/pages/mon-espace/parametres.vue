<script setup lang="ts">
import type { PreferencesNotifications } from '#shared/types'

definePageMeta({ layout: 'espace', middleware: 'auth' })
usePagePrivee('Paramètres du compte')

const auth = useAuthStore()

// --- Coordonnées -------------------------------------------------------------
const email = ref(auth.utilisateur?.email ?? '')
const motDePasseEmail = ref('')
const messageEmail = ref('')
const erreurEmail = ref('')

async function changerEmail() {
  erreurEmail.value = ''
  messageEmail.value = ''
  try {
    await $fetch('/api/mon-espace/compte/email', {
      method: 'PUT',
      body: { email: email.value, motDePasse: motDePasseEmail.value },
    })
    await auth.rafraichir()
    motDePasseEmail.value = ''
    messageEmail.value = 'Adresse e-mail modifiée.'
  } catch (e) {
    erreurEmail.value = (e as { statusMessage?: string }).statusMessage ?? 'Modification impossible.'
  }
}

// --- Notifications -----------------------------------------------------------
const preferences = reactive<PreferencesNotifications>({
  email: true,
  whatsapp: true,
  rappelsSessions: true,
  nouveautes: false,
  ...(auth.utilisateur?.preferencesNotifications ?? {}),
})
const messagePreferences = ref('')

async function enregistrerPreferences() {
  await $fetch('/api/mon-espace/compte/notifications', { method: 'PUT', body: { ...preferences } })
  await auth.rafraichir()
  messagePreferences.value = 'Préférences enregistrées.'
}

// --- Suppression (parcours en deux temps) ------------------------------------
const suppression = ref<0 | 1 | 2>(0)
const motDePasseSuppression = ref('')
const confirmation = ref('')
const erreurSuppression = ref('')
const envoiSuppression = ref(false)

async function supprimer() {
  erreurSuppression.value = ''
  envoiSuppression.value = true
  try {
    await $fetch('/api/mon-espace/compte/suppression', {
      method: 'POST',
      body: { motDePasse: motDePasseSuppression.value, confirmation: confirmation.value },
    })
    auth.utilisateur = null
    await navigateTo('/?compte=supprime')
  } catch (e) {
    erreurSuppression.value = (e as { statusMessage?: string }).statusMessage ?? 'Suppression impossible.'
  } finally {
    envoiSuppression.value = false
  }
}
</script>

<template>
  <div class="max-w-[760px]">
    <h1 class="text-[30px] font-medium">Paramètres du compte</h1>
    <p class="mt-2 text-[15px] text-texte">
      Identifiants, notifications et fermeture du compte. Votre fiche apprenant se modifie
      <NuxtLink to="/mon-espace/profil" class="font-bold underline">ici</NuxtLink>.
    </p>

    <section class="mt-8 rounded-[14px] border border-ligne-douce p-6">
      <h2 class="font-title text-[21px] font-light">Adresse e-mail</h2>
      <p class="mt-1 text-[13.5px] text-discret">C’est votre identifiant de connexion. Le mot de passe est demandé pour la modifier.</p>
      <form class="mt-4 grid gap-4 sm:grid-cols-2" @submit.prevent="changerEmail">
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Nouvelle adresse</span>
          <input v-model="email" type="email" required class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Mot de passe</span>
          <input v-model="motDePasseEmail" type="password" autocomplete="current-password" required class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
        </label>
        <div class="sm:col-span-2">
          <UiBaseButton type="submit" taille="sm" variante="sombre">Modifier l’adresse</UiBaseButton>
          <p v-if="messageEmail" class="mt-2 text-[14px] text-succes">{{ messageEmail }}</p>
          <p v-if="erreurEmail" class="mt-2 text-[14px] text-erreur">{{ erreurEmail }}</p>
        </div>
      </form>
    </section>

    <section class="mt-6 rounded-[14px] border border-ligne-douce p-6">
      <h2 class="font-title text-[21px] font-light">Mot de passe</h2>
      <CompteFormulaireMotDePasse class="mt-4" />
    </section>

    <section class="mt-6 rounded-[14px] border border-ligne-douce p-6">
      <h2 class="font-title text-[21px] font-light">Notifications</h2>
      <p class="mt-1 text-[13.5px] text-discret">
        Les confirmations de paiement et les modifications de sessions réservées vous sont toujours envoyées.
      </p>
      <form class="mt-4 space-y-3" @submit.prevent="enregistrerPreferences">
        <label class="flex items-center gap-3 text-[14.5px]"><input v-model="preferences.email" type="checkbox" class="size-4 accent-social"> Recevoir les e-mails</label>
        <label class="flex items-center gap-3 text-[14.5px]"><input v-model="preferences.whatsapp" type="checkbox" class="size-4 accent-social"> Recevoir les messages WhatsApp</label>
        <label class="flex items-center gap-3 text-[14.5px]"><input v-model="preferences.rappelsSessions" type="checkbox" class="size-4 accent-social"> Rappels avant les sessions de coaching</label>
        <label class="flex items-center gap-3 text-[14.5px]"><input v-model="preferences.nouveautes" type="checkbox" class="size-4 accent-social"> Nouveaux modules et actualités E-Masterclass Big Five</label>
        <div class="pt-2">
          <UiBaseButton type="submit" taille="sm" variante="sombre">Enregistrer</UiBaseButton>
          <p v-if="messagePreferences" class="mt-2 text-[14px] text-succes">{{ messagePreferences }}</p>
        </div>
      </form>
    </section>

    <section class="mt-6 rounded-[14px] border border-erreur/40 p-6">
      <h2 class="font-title text-[21px] font-light text-erreur-fonce">Supprimer mon compte</h2>
      <p class="mt-1 text-[13.5px] text-texte">
        Vous perdez l’accès à vos modules et à vos sessions. Les certificats déjà délivrés restent
        vérifiables par leur numéro. Cette action est irréversible.
      </p>
      <UiBaseButton class="mt-4" taille="sm" variante="contour" @click="suppression = 1">
        Supprimer mon compte…
      </UiBaseButton>
    </section>

    <div v-if="suppression" class="fixed inset-0 z-50 grid place-items-center bg-encre/50 p-4">
      <div class="w-full max-w-lg rounded-carte bg-white p-6">
        <template v-if="suppression === 1">
          <h2 class="font-title text-[21px] font-light">Avant de supprimer votre compte</h2>
          <ul class="mt-4 list-disc space-y-2 pl-5 text-[14px] text-texte">
            <li>Vos <b>modules achetés</b> ne seront plus accessibles, sans remboursement.</li>
            <li>Vos <b>réservations de sessions</b> et demandes de coaching privé en cours sont annulées.</li>
            <li>Vos <b>certificats</b> restent vérifiables par leur numéro et leur QR code.</li>
            <li>Vos données de paiement sont conservées le temps légal, puis supprimées.</li>
          </ul>
          <div class="mt-5 flex flex-wrap gap-2">
            <UiBaseButton taille="sm" variante="sombre" @click="suppression = 2">Je comprends, continuer</UiBaseButton>
            <UiBaseButton taille="sm" variante="contour" @click="suppression = 0">Garder mon compte</UiBaseButton>
          </div>
        </template>
        <template v-else>
          <h2 class="font-title text-[21px] font-light">Confirmer la suppression</h2>
          <form class="mt-4 space-y-4" @submit.prevent="supprimer">
            <label class="block">
              <span class="mb-1.5 block text-[13px] font-bold text-texte">Votre mot de passe</span>
              <input v-model="motDePasseSuppression" type="password" autocomplete="current-password" required class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px]">
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[13px] font-bold text-texte">Tapez « SUPPRIMER »</span>
              <input v-model="confirmation" required class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px]">
            </label>
            <p v-if="erreurSuppression" class="text-[14px] text-erreur">{{ erreurSuppression }}</p>
            <div class="flex flex-wrap gap-2">
              <UiBaseButton type="submit" taille="sm" variante="sombre" :disabled="confirmation !== 'SUPPRIMER' || envoiSuppression">
                Supprimer définitivement
              </UiBaseButton>
              <UiBaseButton taille="sm" variante="contour" @click="suppression = 0">Annuler</UiBaseButton>
            </div>
          </form>
        </template>
      </div>
    </div>
  </div>
</template>
