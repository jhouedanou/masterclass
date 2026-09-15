<script setup lang="ts">
/**
 * Connexion à l'administration (planche C, écran 08) : accès séparé du site, en
 * deux temps — mot de passe, puis second facteur.
 *
 * Le second facteur dépend du fournisseur configuré côté serveur. Avec `totp`,
 * le code vient d'une application d'authentification : rien n'est envoyé, donc
 * ni compte à rebours ni bouton de renvoi. Un compte qui n'est pas encore
 * enrôlé passe d'abord par l'écran du QR code.
 */
definePageMeta({ layout: 'auth' })
usePagePrivee('Connexion à l’administration')

const auth = useAuthStore()
const route = useRoute()

const etape = ref<'identifiants' | 'code' | 'enrolement' | 'secours'>('identifiants')
const email = ref('')
const motDePasse = ref('')
const code = ref('')
const masque = ref('')
const whatsapp = ref(false)
const fournisseur = ref<'interne' | 'supabase-auth' | 'totp'>('interne')
const totp = computed(() => fournisseur.value === 'totp')

/** Enrôlement : QR code et secret lisible, remis une seule fois par le serveur. */
const qr = ref('')
const secret = ref('')
/** Codes de secours, affichés une seule fois après l'activation. */
const codesSecours = ref<string[]>([])
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
    if (reponse.etape === 'session') {
      await navigateTo(String(route.query.suite ?? '/admin'))
      return
    }
    masque.value = reponse.masque ?? ''
    whatsapp.value = reponse.whatsapp === true
    fournisseur.value = reponse.fournisseur ?? 'interne'
    code.value = ''

    if (reponse.etape === 'enrolement') {
      await demarrerEnrolement()
      return
    }
    etape.value = 'code'
    // Le compte à rebours n'a de sens que pour un code envoyé : celui d'une
    // application se renouvelle tout seul.
    if (!totp.value) demarrerCompteARebours()
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

/** Demande un secret neuf et son QR code. Le secret n'est activé qu'après un
 *  premier code correct : un mauvais scan ne condamne donc pas le compte. */
async function demarrerEnrolement() {
  erreur.value = ''
  enCours.value = true
  try {
    const reponse = await $fetch<{ qr: string; secret: string }>('/api/auth/admin/totp/enrolement', {
      method: 'POST',
    })
    qr.value = reponse.qr
    secret.value = reponse.secret
    etape.value = 'enrolement'
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Enrôlement impossible.'
    etape.value = 'identifiants'
  } finally {
    enCours.value = false
  }
}

async function activerEnrolement() {
  erreur.value = ''
  enCours.value = true
  try {
    const reponse = await $fetch<{ codesSecours: string[] }>('/api/auth/admin/totp/activer', {
      method: 'POST',
      body: { code: code.value },
    })
    codesSecours.value = reponse.codesSecours
    code.value = ''
    etape.value = 'secours'
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Code refusé.'
  } finally {
    enCours.value = false
  }
}

function copierCodesSecours() {
  navigator.clipboard?.writeText(codesSecours.value.join('\n'))
  info.value = 'Codes copiés.'
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
        Accès réservé à l’équipe E-Masterclass Big Five. Une double vérification suit le mot de passe.
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

    <!-- Enrôlement : première connexion avec une application d'authentification. -->
    <form v-else-if="etape === 'enrolement'" class="mt-8 space-y-4" @submit.prevent="activerEnrolement">
      <p class="text-[15px] text-texte">
        Scannez ce QR code avec votre application d’authentification — Google Authenticator,
        Authy, le gestionnaire de mots de passe de votre téléphone —, puis saisissez le code
        qu’elle affiche pour confirmer.
      </p>
      <div class="flex flex-col items-center gap-3 rounded-[12px] border border-ligne p-5">
        <img v-if="qr" :src="qr" alt="QR code d’enrôlement" width="240" height="240" class="rounded-[6px]">
        <p class="text-center text-[12.5px] text-discret">
          Impossible de scanner ? Saisissez cette clé à la main :<br>
          <code class="font-mono text-[13px] tracking-wider text-encre">{{ secret }}</code>
        </p>
      </div>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Code affiché par l’application</span>
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
      <UiBaseButton type="submit" class="w-full" taille="lg" variante="sombre" :disabled="enCours || code.length !== 6">
        {{ enCours ? 'Vérification…' : 'Activer' }}
      </UiBaseButton>
      <button type="button" class="text-[14px] text-discret hover:underline" @click="etape = 'identifiants'; erreur = ''">
        Changer de compte
      </button>
    </form>

    <!-- Codes de secours : affichés une seule fois, jamais relisibles ensuite. -->
    <div v-else-if="etape === 'secours'" class="mt-8 space-y-4">
      <p class="text-[15px] text-texte">
        Double authentification activée. Conservez ces <b>codes de secours</b> hors de votre
        téléphone : ils sont le seul moyen d’entrer si vous le perdez. Chacun ne sert qu’une fois,
        et ils ne seront plus affichés.
      </p>
      <ul class="grid grid-cols-2 gap-2 rounded-[12px] border border-ligne p-5 font-mono text-[15px]">
        <li v-for="c in codesSecours" :key="c" class="text-center tracking-wider">{{ c }}</li>
      </ul>
      <p v-if="info" class="text-[14px] text-succes">{{ info }}</p>
      <div class="flex gap-3">
        <UiBaseButton type="button" variante="contour" @click="copierCodesSecours">Copier</UiBaseButton>
        <UiBaseButton type="button" class="flex-1" variante="sombre" @click="etape = 'code'; erreur = ''">
          J’ai noté ces codes
        </UiBaseButton>
      </div>
    </div>

    <form v-else class="mt-8 space-y-4" @submit.prevent="soumettreCode">
      <p v-if="totp" class="text-[15px] text-texte">
        Saisissez le code à six chiffres affiché par votre application d’authentification.
      </p>
      <p v-else class="text-[15px] text-texte">
        Un code à six chiffres a été envoyé à <b>{{ masque }}</b><span v-if="whatsapp"> et sur votre WhatsApp</span>.
        Il reste valable <b>{{ compteARebours }}</b>.
      </p>
      <label class="block">
        <span class="mb-1.5 block text-[13px] font-bold text-texte">Code de vérification</span>
        <input
          v-model="code"
          :inputmode="totp ? 'text' : 'numeric'"
          :maxlength="totp ? 11 : 6"
          autocomplete="one-time-code"
          required
          autofocus
          class="w-full rounded-[10px] border border-ligne px-4 py-3 text-center font-mono uppercase focus:border-social focus:outline-none"
          :class="totp ? 'text-[22px] tracking-[.25em]' : 'text-[28px] tracking-[.5em]'"
        >
      </label>
      <p v-if="erreur" class="text-[14px] text-erreur">{{ erreur }}</p>
      <p v-if="info" class="text-[14px] text-succes">{{ info }}</p>
      <UiBaseButton
        type="submit"
        class="w-full"
        taille="lg"
        variante="sombre"
        :disabled="enCours || (totp ? code.trim().length < 6 : code.length !== 6)"
      >
        {{ enCours ? 'Vérification…' : 'Accéder à l’administration' }}
      </UiBaseButton>
      <div class="flex items-center justify-between text-[14px]">
        <button v-if="!totp" type="button" class="text-discret hover:underline" @click="renvoyer">Renvoyer le code</button>
        <span v-else />
        <button type="button" class="text-discret hover:underline" @click="etape = 'identifiants'; erreur = ''">Changer de compte</button>
      </div>
      <p v-if="totp" class="text-[12.5px] text-discret">
        Téléphone perdu ? Saisissez l’un de vos codes de secours à la place.
      </p>
      <p v-else-if="fournisseur === 'interne'" class="text-[12.5px] text-discret">
        Tant que l’envoi automatique n’est pas branché, le code apparaît dans la sortie du serveur.
      </p>
      <p v-else class="text-[12.5px] text-discret">
        Le code est envoyé par e-mail. Vérifiez vos indésirables si rien n’arrive dans la minute.
      </p>
    </form>
  </div>
</template>
