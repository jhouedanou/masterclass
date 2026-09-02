<script setup lang="ts">
/**
 * Connexion à l'administration (planche C, écran 08) : accès séparé du site,
 * en deux temps — mot de passe, puis code à six chiffres reçu par e-mail et
 * WhatsApp, valable dix minutes.
 */
definePageMeta({ layout: 'auth' })
usePagePrivee('Connexion à l’administration')

const auth = useAuthStore()
const route = useRoute()

const etape = ref<'identifiants' | 'code'>('identifiants')
const email = ref('')
const motDePasse = ref('')
const code = ref('')
const masque = ref('')
const whatsapp = ref(false)
const fournisseur = ref<'interne' | 'supabase-auth'>('interne')
const erreur = ref('')
const info = ref('')
const enCours = ref(false)

const VALIDITE_SECONDES = 10 * 60
const restant = ref(VALIDITE_SECONDES)
let minuteur: ReturnType<typeof setInterval> | undefined

function demarrerCompteARebours() {
  restant.value = VALIDITE_SECONDES
  if (minuteur) clearInterval(minuteur)
  minuteur = setInterval(() => {
    restant.value = Math.max(0, restant.value - 1)
    if (restant.value === 0 && minuteur) clearInterval(minuteur)
  }, 1000)
}
onBeforeUnmount(() => minuteur && clearInterval(minuteur))

const compteARebours = computed(() => {
  const m = Math.floor(restant.value / 60)
  const s = String(restant.value % 60).padStart(2, '0')
  return `${m}:${s}`
})

async function soumettreIdentifiants() {
  erreur.value = ''
  enCours.value = true
  try {
    const reponse = await auth.connexionAdmin(email.value, motDePasse.value)
    masque.value = reponse.masque
    whatsapp.value = (reponse as { whatsapp?: boolean }).whatsapp === true
    fournisseur.value = (reponse as { fournisseur?: 'interne' | 'supabase-auth' }).fournisseur ?? 'interne'
    etape.value = 'code'
    code.value = ''
    demarrerCompteARebours()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Connexion impossible.'
  } finally {
    enCours.value = false
  }
}

async function soumettreCode() {
  erreur.value = ''
  enCours.value = true
  try {
    await auth.validerCode(code.value)
    await navigateTo(String(route.query.suite ?? '/admin'))
  } catch (e) {
    const statut = (e as { statusCode?: number }).statusCode
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Code refusé.'
    if (statut === 401 && erreur.value.includes('Recommencez')) etape.value = 'identifiants'
  } finally {
    enCours.value = false
  }
}

async function renvoyer() {
  erreur.value = ''
  info.value = ''
  try {
    await $fetch('/api/auth/admin/renvoyer-code', { method: 'POST' })
    info.value = 'Nouveau code envoyé.'
    code.value = ''
    demarrerCompteARebours()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Renvoi impossible.'
  }
}
</script>

<template>
  <div>
    <p class="surtitre text-discret">Administration</p>
    <h1 class="mt-2 text-[34px] font-medium">Connexion sécurisée</h1>

    <form v-if="etape === 'identifiants'" class="mt-8 space-y-4" @submit.prevent="soumettreIdentifiants">
      <p class="text-[15px] text-texte">
        Accès réservé à l’équipe E-Masterclass Big Five. Une double vérification par code suit le mot de passe.
      </p>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Adresse e-mail</span>
        <input v-model="email" type="email" autocomplete="username" required class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
      </label>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Mot de passe</span>
        <input v-model="motDePasse" type="password" autocomplete="current-password" required class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
      </label>
      <p v-if="erreur" class="text-[14px] text-erreur">{{ erreur }}</p>
      <UiBaseButton type="submit" class="w-full" taille="lg" variante="sombre" :disabled="enCours">
        {{ enCours ? 'Vérification…' : 'Continuer' }}
      </UiBaseButton>
      <p class="text-[13px] text-discret">
        Chaque tentative est journalisée (adresse IP, appareil, horodatage). Cinq échecs bloquent le compte 30 minutes.
      </p>
      <NuxtLink to="/mot-de-passe-oublie" class="block text-[14px] text-discret hover:underline">Mot de passe oublié ?</NuxtLink>
    </form>

    <form v-else class="mt-8 space-y-4" @submit.prevent="soumettreCode">
      <p class="text-[15px] text-texte">
        Un code à six chiffres a été envoyé à <b>{{ masque }}</b><span v-if="whatsapp"> et sur votre WhatsApp</span>.
        Il reste valable <b>{{ compteARebours }}</b>.
      </p>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Code de vérification</span>
        <input
          v-model="code"
          inputmode="numeric"
          pattern="[0-9]{6}"
          maxlength="6"
          autocomplete="one-time-code"
          required
          autofocus
          class="w-full rounded-[10px] border border-ligne px-4 py-3 text-center font-mono text-[28px] tracking-[.5em] focus:border-social focus:outline-none"
        >
      </label>
      <p v-if="erreur" class="text-[14px] text-erreur">{{ erreur }}</p>
      <p v-if="info" class="text-[14px] text-succes">{{ info }}</p>
      <UiBaseButton type="submit" class="w-full" taille="lg" variante="sombre" :disabled="enCours || code.length !== 6">
        {{ enCours ? 'Vérification…' : 'Accéder à l’administration' }}
      </UiBaseButton>
      <div class="flex items-center justify-between text-[14px]">
        <button type="button" class="text-discret hover:underline" @click="renvoyer">Renvoyer le code</button>
        <button type="button" class="text-discret hover:underline" @click="etape = 'identifiants'; erreur = ''">Changer de compte</button>
      </div>
      <p v-if="fournisseur === 'interne'" class="text-[12.5px] text-discret">
        Tant que l’envoi automatique n’est pas branché, le code apparaît dans la sortie du serveur.
      </p>
      <p v-else class="text-[12.5px] text-discret">
        Le code est envoyé par e-mail. Vérifiez vos indésirables si rien n’arrive dans la minute.
      </p>
    </form>
  </div>
</template>
