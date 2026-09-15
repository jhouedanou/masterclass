<script setup lang="ts">
import type { PreferencesNotifications } from '#shared/types'

definePageMeta({ layout: 'espace', middleware: 'auth' })
usePagePrivee('Paramètres du compte')

const auth = useAuthStore()

// --- Lignes compactes : Email · WhatsApp · Mot de passe --------------------
const ouvert = ref<'' | 'email' | 'whatsapp' | 'motDePasse'>('')
const messages = reactive<Record<string, string>>({})
const erreurs = reactive<Record<string, string>>({})

const email = ref(auth.utilisateur?.email ?? '')
const motDePasseEmail = ref('')
async function changerEmail() {
  erreurs.email = ''
  try {
    await $fetch('/api/mon-espace/compte/email', { method: 'PUT', body: { email: email.value, motDePasse: motDePasseEmail.value } })
    await auth.rafraichir()
    motDePasseEmail.value = ''
    messages.email = 'Adresse email modifiée.'
    ouvert.value = ''
  } catch (e) {
    const r = e as { statusMessage?: string; data?: { statusMessage?: string } }
    erreurs.email = r.data?.statusMessage ?? r.statusMessage ?? 'Modification impossible.'
  }
}

const whatsapp = ref(auth.utilisateur?.whatsapp ?? '')
async function changerWhatsapp() {
  erreurs.whatsapp = ''
  try {
    await $fetch('/api/mon-espace/compte/profil', {
      method: 'PUT',
      body: { prenom: auth.utilisateur?.prenom, nom: auth.utilisateur?.nom, whatsapp: whatsapp.value, pays: auth.utilisateur?.pays },
    })
    await auth.rafraichir()
    messages.whatsapp = 'Numéro WhatsApp modifié.'
    ouvert.value = ''
  } catch (e) {
    const r = e as { statusMessage?: string; data?: { statusMessage?: string } }
    erreurs.whatsapp = r.data?.statusMessage ?? r.statusMessage ?? 'Modification impossible.'
  }
}

// --- Notifications : trois interrupteurs (planche B, écran 11) -------------
const preferences = reactive<PreferencesNotifications>({
  email: true,
  whatsapp: true,
  rappelsSessions: true,
  nouveautes: false,
  ...(auth.utilisateur?.preferencesNotifications ?? {}),
})
/** « Nouveaux modules de mes programmes » et « Offres et actualités » partagent la préférence `nouveautes`. */
const nouveauxModules = ref(preferences.nouveautes)
const offres = ref(preferences.nouveautes)
const messagePreferences = ref('')
watch([() => preferences.rappelsSessions, nouveauxModules, offres], async () => {
  preferences.nouveautes = nouveauxModules.value || offres.value
  await $fetch('/api/mon-espace/compte/notifications', { method: 'PUT', body: { ...preferences } })
  await auth.rafraichir()
  messagePreferences.value = 'Préférences enregistrées.'
})

// --- Suppression -------------------------------------------------------------
const suppression = ref(false)
</script>

<template>
  <div class="max-w-[760px]">
    <h1 class="text-[30px] font-medium">Paramètres du compte</h1>

    <section class="mt-8 divide-y divide-ligne-claire rounded-[14px] border border-ligne-douce bg-white">
      <!-- Email de connexion -->
      <div class="p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-[13px] font-bold text-discret">Email de connexion</p>
            <p class="mt-0.5 text-[15px] text-encre">{{ auth.utilisateur?.email }}</p>
          </div>
          <UiBaseButton taille="sm" variante="contour" @click="ouvert = ouvert === 'email' ? '' : 'email'">Modifier</UiBaseButton>
        </div>
        <form v-if="ouvert === 'email'" class="mt-4 grid gap-3 sm:grid-cols-2" @submit.prevent="changerEmail">
          <input v-model="email" type="email" required placeholder="Nouvelle adresse" class="rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
          <input v-model="motDePasseEmail" type="password" autocomplete="current-password" required placeholder="Mot de passe" class="rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
          <div class="sm:col-span-2"><UiBaseButton type="submit" taille="sm" variante="sombre">Enregistrer</UiBaseButton></div>
        </form>
        <p v-if="messages.email" class="mt-2 text-[13.5px] text-succes">{{ messages.email }}</p>
        <p v-if="erreurs.email" class="mt-2 text-[13.5px] text-erreur">{{ erreurs.email }}</p>
      </div>

      <!-- Numéro WhatsApp -->
      <div class="p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-[13px] font-bold text-discret">Numéro WhatsApp</p>
            <p class="mt-0.5 text-[15px] text-encre">
              {{ auth.utilisateur?.whatsapp || 'Non renseigné' }} <span class="text-discret">— rappels de session</span>
            </p>
          </div>
          <UiBaseButton taille="sm" variante="contour" @click="ouvert = ouvert === 'whatsapp' ? '' : 'whatsapp'">Modifier</UiBaseButton>
        </div>
        <form v-if="ouvert === 'whatsapp'" class="mt-4 flex flex-wrap items-start gap-3" @submit.prevent="changerWhatsapp">
          <!-- Même composant que la fiche apprenant : un seul masque pour un seul champ. -->
          <UiChampTelephone v-model="whatsapp" :pays="auth.utilisateur?.pays" class="min-w-[280px] flex-1" />
          <UiBaseButton type="submit" taille="sm" variante="sombre">Enregistrer</UiBaseButton>
        </form>
        <p v-if="messages.whatsapp" class="mt-2 text-[13.5px] text-succes">{{ messages.whatsapp }}</p>
        <p v-if="erreurs.whatsapp" class="mt-2 text-[13.5px] text-erreur">{{ erreurs.whatsapp }}</p>
      </div>

      <!-- Mot de passe -->
      <div class="p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-[13px] font-bold text-discret">Mot de passe</p>
            <p class="mt-0.5 text-[15px] text-encre">
              Dernière modification :
              {{ auth.utilisateur?.motDePasseMajLe ? formatDate(auth.utilisateur.motDePasseMajLe) : 'jamais' }}
            </p>
          </div>
          <UiBaseButton taille="sm" variante="contour" @click="ouvert = ouvert === 'motDePasse' ? '' : 'motDePasse'">Changer</UiBaseButton>
        </div>
        <CompteFormulaireMotDePasse v-if="ouvert === 'motDePasse'" class="mt-4" />
      </div>
    </section>

    <section class="mt-6 rounded-[14px] border border-ligne-douce bg-white p-5">
      <h2 class="font-title text-[19px] font-light">Notifications</h2>
      <div class="mt-2 divide-y divide-ligne-claire">
        <UiInterrupteur v-model="preferences.rappelsSessions" libelle="Rappels de session de coaching (email + WhatsApp)" />
        <UiInterrupteur v-model="nouveauxModules" libelle="Nouveaux modules de mes programmes" />
        <UiInterrupteur v-model="offres" libelle="Offres et actualités E-Masterclass Big Five" />
      </div>
      <p v-if="messagePreferences" class="mt-2 text-[13px] text-succes">{{ messagePreferences }}</p>
    </section>

    <section class="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-erreur/40 bg-white p-5">
      <div>
        <h2 class="font-title text-[19px] font-light text-erreur-fonce">Supprimer mon compte</h2>
        <p class="mt-1 text-[13.5px] text-texte">Action définitive après délai de rétractation de 14 jours.</p>
      </div>
      <UiBaseButton taille="sm" variante="contour" @click="suppression = true">Supprimer</UiBaseButton>
    </section>

    <EspaceModaleSuppressionCompte v-if="suppression" @fermer="suppression = false" />
  </div>
</template>
