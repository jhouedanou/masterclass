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
// La maquette pose une carte sombre isolée : ni en-tête, ni pied, ni panneau
// décoratif — le gabarit `auth` du site public n'a rien à faire ici.
definePageMeta({ layout: false })
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

/**
 * Six cases plutôt qu'un champ (planche C, écran 08). Le code de secours, lui,
 * fait onze caractères : il garde un champ simple, sans quoi on l'écrirait
 * dans six cases de un.
 */
const codeDeSecours = ref(false)
const cases = ref<HTMLInputElement[]>([])

function saisirCase(index: number, evenement: Event) {
  const champ = evenement.target as HTMLInputElement
  const chiffres = champ.value.replace(/\D/g, '')
  if (!chiffres) {
    champ.value = ''
    majCode()
    return
  }
  // Un collage de six chiffres remplit toutes les cases d'un coup : c'est le
  // geste naturel depuis une application d'authentification.
  if (chiffres.length > 1) {
    chiffres
      .slice(0, 6 - index)
      .split('')
      .forEach((c, i) => {
        const cible = cases.value[index + i]
        if (cible) cible.value = c
      })
    cases.value[Math.min(index + chiffres.length, 5)]?.focus()
  } else {
    champ.value = chiffres
    cases.value[index + 1]?.focus()
  }
  majCode()
}

/** Retour arrière sur une case vide : on remonte à la précédente. */
function effacerCase(index: number, evenement: KeyboardEvent) {
  const champ = evenement.target as HTMLInputElement
  if (evenement.key === 'Backspace' && !champ.value && index > 0) {
    cases.value[index - 1]?.focus()
  }
}

function majCode() {
  code.value = cases.value.map((c) => c?.value ?? '').join('')
}

watch(codeDeSecours, () => {
  code.value = ''
  cases.value.forEach((c) => c && (c.value = ''))
})

/**
 * Délai avant de pouvoir redemander un code. Sans lui, le bouton « Renvoyer »
 * invite à marteler un envoi qui coûte, et chaque renvoi invalide le code
 * précédent — l'utilisateur se retrouve à courir après ses propres codes.
 */
const DELAI_RENVOI_SECONDES = 60
const avantRenvoi = ref(0)
let minuteurRenvoi: ReturnType<typeof setInterval> | undefined

function bloquerRenvoi() {
  avantRenvoi.value = DELAI_RENVOI_SECONDES
  if (minuteurRenvoi) clearInterval(minuteurRenvoi)
  minuteurRenvoi = setInterval(() => {
    avantRenvoi.value = Math.max(0, avantRenvoi.value - 1)
    if (avantRenvoi.value === 0 && minuteurRenvoi) clearInterval(minuteurRenvoi)
  }, 1000)
}
onBeforeUnmount(() => minuteurRenvoi && clearInterval(minuteurRenvoi))

const delaiRenvoi = computed(() => {
  const m = Math.floor(avantRenvoi.value / 60)
  const s = String(avantRenvoi.value % 60).padStart(2, '0')
  return `${m}:${s}`
})

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
    if (!totp.value) {
      demarrerCompteARebours()
      bloquerRenvoi()
    }
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
    cases.value.forEach((c) => c && (c.value = ''))
    demarrerCompteARebours()
    bloquerRenvoi()
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Renvoi impossible.'
  }
}

/** Habillage de la carte sombre de l'écran 08. */
const champ =
  'rounded-[10px] border-[1.5px] border-nuit-bordure bg-encre-800 px-3.5 py-3.5 text-[14px] text-white focus:border-social focus:outline-none'
const etiquette = 'text-[12.5px] font-bold text-gris-perle'
const bouton =
  'w-full rounded-full bg-social py-[15px] text-center text-[15px] font-extrabold text-white transition hover:bg-social-fonce disabled:cursor-not-allowed disabled:opacity-50'
const lienSombre = 'text-center text-[12.5px] text-discret-clair hover:text-white'
const note = 'text-[12px] leading-[1.6] text-discret-clair'
const chapo = 'text-[13px] leading-[1.6] text-gris-perle'
const alerte = 'rounded-[10px] border border-erreur-fonce bg-erreur-fonce/20 px-3 py-2.5 text-[13px] text-[#f2c4c9]'
</script>

<template>
  <div class="flex min-h-screen items-start justify-center bg-fond-cadre px-4 py-12">
    <div class="sur-sombre w-full max-w-[420px] rounded-[16px] bg-encre p-8 text-white sm:p-10">
      <div class="mb-5 inline-block rounded-[10px] bg-white px-3.5 py-2.5">
        <img src="/images/brand/logo.png" alt="E-Masterclass Big Five" class="block h-[30px] w-auto">
      </div>

      <template v-if="etape === 'identifiants'">
        <p class="text-[11px] font-bold tracking-[0.14em] text-discret-clair uppercase">Espace administration</p>
        <h1 class="mt-1.5 font-title text-[23px] font-light text-white">Connexion sécurisée</h1>
      </template>
      <template v-else>
        <p class="text-[11px] font-bold tracking-[0.14em] text-discret-clair uppercase">Étape 2 / 2</p>
        <h1 class="mt-1.5 font-title text-[23px] font-light text-white">
          {{ etape === 'enrolement' ? 'Application d’authentification' : etape === 'secours' ? 'Codes de secours' : 'Code de vérification' }}
        </h1>
      </template>

      <form v-if="etape === 'identifiants'" class="mt-5 flex flex-col gap-3.5" @submit.prevent="soumettreIdentifiants">
        <label class="flex flex-col gap-1.5">
          <span :class="etiquette">Email professionnel</span>
          <input v-model="email" type="email" autocomplete="username" required :class="champ">
        </label>
        <label class="flex flex-col gap-1.5">
          <span :class="etiquette">Mot de passe</span>
          <input v-model="motDePasse" type="password" autocomplete="current-password" required :class="champ">
        </label>
        <p v-if="erreur" :class="alerte">{{ erreur }}</p>
        <button type="submit" :class="bouton" :disabled="enCours">
          {{ enCours ? 'Vérification…' : 'Continuer' }}
        </button>
        <p :class="note">
          Connexion journalisée (IP, appareil, horodatage). 5 échecs = verrouillage 30 min + alerte
          à l’admin principal.
        </p>
        <!--
          Renvoi permanent : cet écran refuse les comptes apprenant et formateur
          derrière le message d'un identifiant inconnu, pour ne pas révéler
          qu'un compte existe. Le dire d'emblée lève la confusion sans rien
          divulguer ; ne l'afficher qu'après une tentative trahirait le compte.
        -->
        <p :class="[note, 'border-t border-nuit-bordure pt-3.5']">
          Cet accès est réservé à l’administration. Apprenants et formateurs se connectent depuis
          <NuxtLink to="/connexion" class="font-bold">la page de connexion habituelle</NuxtLink>.
        </p>
      </form>

      <!-- Enrôlement : première connexion avec une application d'authentification. -->
      <form v-else-if="etape === 'enrolement'" class="mt-4 flex flex-col gap-3.5" @submit.prevent="activerEnrolement">
        <p :class="chapo">
          Scannez ce QR code avec votre application d’authentification, puis saisissez le code
          qu’elle affiche pour confirmer.
        </p>
        <div class="flex flex-col items-center gap-3 rounded-[12px] border border-nuit-bordure bg-encre-800 p-4">
          <img v-if="qr" :src="qr" alt="QR code d’enrôlement" width="200" height="200" class="rounded-[6px] bg-white p-2">
          <p class="text-center text-[12px] text-discret-clair">
            Impossible de scanner ? Saisissez cette clé à la main :<br>
            <code class="font-mono text-[13px] tracking-wider text-white">{{ secret }}</code>
          </p>
        </div>
        <label class="flex flex-col gap-1.5">
          <span :class="etiquette">Code affiché par l’application</span>
          <input
            v-model="code"
            inputmode="numeric"
            pattern="[0-9]{6}"
            maxlength="6"
            autocomplete="one-time-code"
            required
            :class="[champ, 'text-center font-mono text-[24px] tracking-[.4em]']"
          >
        </label>
        <p v-if="erreur" :class="alerte">{{ erreur }}</p>
        <button type="submit" :class="bouton" :disabled="enCours || code.length !== 6">
          {{ enCours ? 'Vérification…' : 'Activer' }}
        </button>
        <button type="button" :class="lienSombre" @click="etape = 'identifiants'; erreur = ''">
          Changer de compte
        </button>
      </form>

      <!-- Codes de secours : affichés une seule fois, jamais relisibles ensuite. -->
      <div v-else-if="etape === 'secours'" class="mt-4 flex flex-col gap-3.5">
        <p :class="chapo">
          Double authentification activée. Conservez ces <b class="text-white">codes de secours</b>
          hors de votre téléphone : ils sont le seul moyen d’entrer si vous le perdez. Chacun ne
          sert qu’une fois, et ils ne seront plus affichés.
        </p>
        <ul class="grid grid-cols-2 gap-2 rounded-[12px] border border-nuit-bordure bg-encre-800 p-4 font-mono text-[14px]">
          <li v-for="c in codesSecours" :key="c" class="text-center tracking-wider">{{ c }}</li>
        </ul>
        <p v-if="info" class="text-[13px] text-succes-vif">{{ info }}</p>
        <button type="button" :class="bouton" @click="etape = 'code'; erreur = ''">J’ai noté ces codes</button>
        <button type="button" :class="lienSombre" @click="copierCodesSecours">Copier</button>
      </div>

      <form v-else class="mt-4 flex flex-col gap-3.5" @submit.prevent="soumettreCode">
        <p v-if="totp" :class="chapo">
          Saisissez le code à six chiffres affiché par votre application d’authentification.
        </p>
        <p v-else :class="chapo">
          Un code à 6 chiffres a été envoyé par email<span v-if="whatsapp"> et WhatsApp</span> au
          <b class="text-white">{{ masque }}</b>. Valable {{ compteARebours }}.
        </p>

        <fieldset v-if="!codeDeSecours">
          <legend class="sr-only">Code de vérification</legend>
          <div class="grid grid-cols-6 gap-2">
            <input
              v-for="(_, i) in 6"
              :key="i"
              ref="cases"
              inputmode="numeric"
              maxlength="6"
              autocomplete="one-time-code"
              placeholder="·"
              :aria-label="`Chiffre ${i + 1} sur 6`"
              class="w-full min-w-0 rounded-[10px] border-[1.5px] bg-encre-800 py-4 text-center text-[20px] font-extrabold text-white placeholder:font-normal placeholder:text-discret focus:outline-none"
              :class="code[i] ? 'border-social' : 'border-nuit-bordure'"
              @input="saisirCase(i, $event)"
              @keydown="effacerCase(i, $event)"
            >
          </div>
        </fieldset>

        <label v-else class="flex flex-col gap-1.5">
          <span :class="etiquette">Code de secours</span>
          <input
            v-model="code"
            inputmode="text"
            maxlength="11"
            required
            :class="[champ, 'text-center font-mono text-[20px] tracking-[.25em] uppercase']"
          >
        </label>

        <p v-if="erreur" :class="alerte">{{ erreur }}</p>
        <p v-if="info" class="text-[13px] text-succes-vif">{{ info }}</p>

        <button
          type="submit"
          :class="bouton"
          :disabled="enCours || (codeDeSecours ? code.trim().length < 6 : code.length !== 6)"
        >
          {{ enCours ? 'Vérification…' : 'Vérifier et entrer' }}
        </button>

        <p v-if="!totp" class="text-center text-[12.5px] text-discret-clair">
          <button
            type="button"
            class="disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="avantRenvoi > 0"
            @click="renvoyer"
          >
            Renvoyer le code<b v-if="avantRenvoi > 0" class="text-gris-perle"> ({{ delaiRenvoi }})</b>
          </button>
        </p>
        <button v-else type="button" :class="lienSombre" @click="codeDeSecours = !codeDeSecours">
          {{ codeDeSecours ? 'Revenir au code à six chiffres' : 'Utiliser un code de secours' }}
        </button>
        <button type="button" :class="lienSombre" @click="etape = 'identifiants'; erreur = ''">
          Changer de compte
        </button>

        <p v-if="!totp && fournisseur === 'interne'" :class="note">
          Tant que l’envoi automatique n’est pas branché, le code apparaît dans la sortie du serveur.
        </p>
      </form>
    </div>
  </div>
</template>
