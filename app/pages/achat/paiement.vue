<script setup lang="ts">
import type { CodeEchecPaiement } from '#shared/types'

definePageMeta({ middleware: 'auth' })

const achat = useAchatStore()
const auth = useAuthStore()
const config = useRuntimeConfig()
/** Numéro Mobile Money saisi sur mobile (planche A, 04c), transmis à la fenêtre FeexPay. */
const numeroMobileMoney = ref(auth.utilisateur?.whatsapp ?? '')

const moyens = [
  { valeur: 'mobile-money', libelle: 'Mobile Money', detail: 'Orange, MTN, Moov' },
  { valeur: 'wave', libelle: 'Wave', detail: 'Paiement par QR ou numéro' },
  { valeur: 'djamo', libelle: 'Djamo', detail: 'Carte et compte Djamo' },
  { valeur: 'visa', libelle: 'Visa', detail: 'Carte bancaire internationale' },
] as const

/** Les états du tunnel (spec §8) : attente, vérification, succès, échec,
 *  nouvelle tentative et changement de moyen s'enchaînent depuis « choix ».
 *  « feexpay » : la fenêtre du prestataire est ouverte ou prête à l'être. */
const etat = ref<'choix' | 'attente' | 'feexpay' | 'verification' | 'succes' | 'echec'>('choix')
const message = ref('')
const codeEchec = ref<CodeEchecPaiement | null>(null)
/** Référence FP-… affichée dans le bloc d'échec (planche A, 04c). */
const referenceEchec = ref<string | null>(null)
/** Module déjà acheté (« Double paiement détecté ») : cible du bouton d'accès. */
const slugDoublon = ref<string | null>(null)
const tentatives = ref(0)
/** Hors production : permet de dérouler chacun des six cas d'erreur. */
const simulerEchec = ref<CodeEchecPaiement | ''>('')
const dev = import.meta.dev

const echec = computed(() => (codeEchec.value ? ECHECS_PAIEMENT[codeEchec.value] : null))

usePagePrivee('Choisissez votre moyen de paiement')

/** Objet réglé : un module (tunnel classique) ou une séance de coaching privé. */
const seance = computed(() => achat.seance)
const montant = computed(() => achat.seance?.prixFcfa ?? achat.module?.prixFcfa ?? 0)
const libelleObjet = computed(() => achat.seance?.titre ?? achat.module?.titre ?? '')

// --- FeexPay (SDK JavaScript, docs.feexpay.me) ------------------------------

interface ParametresFeexPay {
  shopId: string
  token: string
  mode: 'SANDBOX' | 'LIVE'
  montant: number
  customId: string
  description: string
  cas: 'MOBILE' | 'CARD' | ''
  email: string
  prenom: string
  nom: string
}

interface ReponseCommande {
  reference: string
  feexpay?: ParametresFeexPay
}

type FeexPayButtonGlobal = {
  init: (conteneur: string, options: Record<string, unknown>) => void
}

const feexpayActif = config.public.feexpayActif
if (feexpayActif) {
  useHead({ script: [{ src: config.public.feexpaySdkUrl, defer: true }] })
}

const CONTENEUR_FEEXPAY = 'feexpay-bouton'
/** Référence de la commande en cours de règlement. */
const commandeEnCours = ref<string | null>(null)
let minuteurVerification: ReturnType<typeof setTimeout> | undefined

onBeforeUnmount(() => minuteurVerification && clearTimeout(minuteurVerification))

async function attendreSdk(): Promise<FeexPayButtonGlobal> {
  for (let i = 0; i < 50; i += 1) {
    const sdk = (window as unknown as { FeexPayButton?: FeexPayButtonGlobal }).FeexPayButton
    if (sdk) return sdk
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error('Le module de paiement FeexPay ne s’est pas chargé.')
}

/** La référence FeexPay dans ce que le SDK rend au rappel, quelle qu'en soit la forme. */
function referenceDepuisRappel(reponse: unknown): string | null {
  if (!reponse || typeof reponse !== 'object') return null
  const r = reponse as Record<string, unknown>
  const source = (r.data && typeof r.data === 'object' ? r.data : r) as Record<string, unknown>
  for (const cle of ['reference', 'transaction_id', 'transactionId', 'id']) {
    const v = source[cle]
    if (typeof v === 'string' && v) return v
  }
  return null
}

async function ouvrirFeexPay(parametres: ParametresFeexPay) {
  etat.value = 'feexpay'
  message.value = 'La fenêtre de paiement FeexPay s’ouvre.'
  await nextTick()
  const sdk = await attendreSdk()
  sdk.init(CONTENEUR_FEEXPAY, {
    id: parametres.shopId,
    token: parametres.token,
    amount: parametres.montant,
    currency: 'XOF',
    mode: parametres.mode,
    custom_id: parametres.customId,
    description: parametres.description,
    case: parametres.cas,
    email: parametres.email,
    first_name: parametres.prenom,
    last_name: parametres.nom,
    phone: numeroMobileMoney.value || undefined,
    callback_info: { commande: parametres.customId },
    callback: (reponse: unknown) => {
      void confirmer(referenceDepuisRappel(reponse))
    },
  })
  // Le SDK rend son propre bouton dans le conteneur : on l'actionne pour
  // l'utilisateur, qui vient déjà de cliquer « Payer ». S'il ne répond pas,
  // le bouton reste visible.
  await nextTick()
  const bouton = document.querySelector<HTMLElement>(`#${CONTENEUR_FEEXPAY} button`)
  bouton?.click()
}

/** Vérification serveur, relancée toutes les trois secondes tant que FeexPay
 *  n'a pas tranché (deux minutes au plus). */
async function confirmer(referenceFeexPay: string | null, essai = 0) {
  if (!commandeEnCours.value) return
  etat.value = 'verification'
  message.value = 'Nous vérifions votre paiement auprès de FeexPay.'
  try {
    const reponse = await $fetch<{ statut: 'confirmee' | 'attente'; reference: string }>(
      `/api/commandes/${encodeURIComponent(commandeEnCours.value)}/confirmer`,
      { method: 'POST', body: { referenceFeexPay } },
    )
    if (reponse.statut === 'confirmee') {
      achat.reference = reponse.reference
      etat.value = 'succes'
      return
    }
    if (essai < 40) {
      minuteurVerification = setTimeout(() => void confirmer(referenceFeexPay, essai + 1), 3000)
      return
    }
    // Deux minutes sans réponse : « Interruption réseau » — la vérification
    // continue côté serveur (webhook), l'apprenant sera prévenu par e-mail.
    afficherEchec('interruption-reseau', ECHECS_PAIEMENT['interruption-reseau'].message, referenceFeexPay)
  } catch (e) {
    const r = e as {
      statusCode?: number
      statusMessage?: string
      data?: { statusMessage?: string; data?: { code?: CodeEchecPaiement; reference?: string; slug?: string } }
    }
    // FeexPay injoignable un instant : on réessaie plutôt que de conclure.
    if (r.statusCode === 502 && essai < 40) {
      minuteurVerification = setTimeout(() => void confirmer(referenceFeexPay, essai + 1), 3000)
      return
    }
    afficherEchec(
      r.data?.data?.code ?? 'erreur-inconnue',
      r.data?.statusMessage ?? r.statusMessage ?? 'Le paiement a échoué.',
      r.data?.data?.reference ?? referenceFeexPay,
      r.data?.data?.slug,
    )
  }
}

function afficherEchec(code: CodeEchecPaiement, texte: string, reference?: string | null, slug?: string) {
  etat.value = 'echec'
  tentatives.value += 1
  codeEchec.value = code
  message.value = ECHECS_PAIEMENT[code]?.message ?? texte
  referenceEchec.value = reference ?? commandeEnCours.value
  slugDoublon.value = slug ?? null
}

// --- Tunnel -------------------------------------------------------------------

async function payer() {
  if (!achat.module && !achat.seance) return
  etat.value = 'attente'
  message.value = feexpayActif ? 'Ouverture de la commande…' : 'Validez la demande sur votre téléphone.'
  codeEchec.value = null
  try {
    const commande = await $fetch<ReponseCommande>('/api/commandes', {
      method: 'POST',
      body: {
        moduleIds: achat.module ? [achat.module.id] : [],
        demandeId: achat.seance?.demandeId,
        moyen: achat.moyen,
        simulerEchec: dev && simulerEchec.value ? simulerEchec.value : undefined,
      },
    })
    commandeEnCours.value = commande.reference
    if (commande.feexpay) {
      await ouvrirFeexPay(commande.feexpay)
      return
    }
    // Simulation (développement) : la commande est déjà confirmée.
    etat.value = 'verification'
    achat.reference = commande.reference
    etat.value = 'succes'
  } catch (e) {
    const r = e as {
      statusMessage?: string
      data?: { statusMessage?: string; data?: { code?: CodeEchecPaiement; reference?: string; slug?: string } }
    }
    afficherEchec(
      r.data?.data?.code ?? 'erreur-inconnue',
      r.data?.statusMessage ?? r.statusMessage ?? (e as Error).message ?? 'Le paiement a échoué.',
      r.data?.data?.reference,
      r.data?.data?.slug,
    )
  }
}

function changerDeMoyen() {
  etat.value = 'choix'
  codeEchec.value = null
}
</script>

<template>
  <div class="mx-auto w-full max-w-[420px] px-5 py-9">
    <UiEtapesAchat v-if="!seance" :etape="3" />

    <h1 class="mt-2.5 mb-5 text-center font-title text-[22px] font-light">
      <span class="lg:hidden">Moyen de paiement</span>
      <span class="hidden lg:inline">Choisissez votre moyen de paiement</span>
    </h1>
    <div v-if="seance" class="mb-4.5 rounded-bloc border border-ligne-douce bg-fond-clair p-5 text-[14px]">
      <p class="text-discret">Séance de coaching privé</p>
      <p class="mt-1 font-title text-[19px] font-light">{{ seance.formateur }} · {{ seance.heures }} h</p>
      <p class="text-[13.5px] text-texte">{{ seance.creneau }} · {{ formatFcfa(seance.prixFcfa, true) }}</p>
    </div>

    <template v-if="etat === 'choix' || etat === 'echec'">
      <div
        v-if="etat === 'echec' && echec"
        class="mb-4.5 rounded-bloc border p-4.5"
        :class="echec.action === 'acceder' ? 'border-succes-bordure bg-succes-voile' : echec.action === 'attendre' ? 'border-alerte-bordure bg-alerte-pale' : 'border-erreur-bordure bg-erreur-voile'"
        role="alert"
      >
        <p class="flex items-center gap-2 font-title text-[21px] font-light" :class="echec.action === 'acceder' ? 'text-succes' : echec.action === 'attendre' ? 'text-alerte' : 'text-erreur-fonce'">
          <span aria-hidden="true">{{ echec.action === 'acceder' ? '✓' : echec.action === 'attendre' ? '…' : '✕' }}</span>
          {{ echec.action === 'acceder' || echec.action === 'attendre' ? echec.titre : 'Paiement non abouti' }}
        </p>
        <p class="mt-1 text-[14px] text-texte">
          <b v-if="echec.action !== 'acceder' && echec.action !== 'attendre'">{{ echec.titre }} — </b>{{ message }}
          <template v-if="referenceEchec"> Référence : <span class="font-mono">{{ referenceEchec }}</span>.</template>
        </p>
        <p class="mt-2 text-[14px] text-texte">{{ echec.conseil }}</p>
        <p v-if="echec.action !== 'acceder'" class="mt-2 text-[12.5px] text-discret">
          Aucun accès n’est ouvert tant que le paiement n’est pas confirmé.
          <template v-if="tentatives >= 2"> Si le problème persiste, notre équipe peut vous aider.</template>
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <UiBaseButton v-if="echec.action === 'acceder'" taille="sm" :to="`/mon-espace/module/${slugDoublon ?? achat.module?.slug}`" @click="achat.vider()">
            Accéder à mon module
          </UiBaseButton>
          <UiBaseButton v-if="echec.action === 'reessayer' || echec.action === 'changer-moyen'" taille="sm" @click="payer">Réessayer le paiement</UiBaseButton>
          <UiBaseButton v-if="echec.action === 'changer-moyen'" taille="sm" variante="contour" @click="changerDeMoyen">
            Changer de moyen de paiement
          </UiBaseButton>
          <UiBaseButton v-if="echec.action === 'attendre'" taille="sm" variante="contour" to="/mon-espace">
            Retourner à mon espace
          </UiBaseButton>
          <UiBaseButton
            v-if="echec.action === 'contacter' || tentatives >= 2"
            taille="sm"
            variante="whatsapp"
            :href="lienWhatsApp(`Bonjour, mon paiement pour « ${libelleObjet} » a échoué (${echec.titre}).`)"
          >
            Contacter l’équipe
          </UiBaseButton>
        </div>
      </div>

      <!-- Quatre pavés égaux, le moyen retenu cerné d'un trait de 2 px : la
           maquette ne montre ni bouton radio ni sous-titre. -->
      <div class="mb-4.5 grid grid-cols-2 gap-3">
        <label
          v-for="moyen in moyens"
          :key="moyen.valeur"
          class="cursor-pointer rounded-[12px] p-4 text-center text-[14px] font-bold"
          :class="achat.moyen === moyen.valeur ? 'border-2 border-social text-encre' : 'border-[1.5px] border-ligne text-texte'"
        >
          <input v-model="achat.moyen" type="radio" :value="moyen.valeur" class="sr-only">
          <span :title="moyen.detail">{{ moyen.libelle }}</span>
        </label>
      </div>

      <!-- Mobile / PWA (planche A, écran 04c) : le numéro Mobile Money est saisi avant de payer ;
           il pré-remplit la fenêtre FeexPay. -->
      <label v-if="achat.moyen === 'mobile-money'" class="mb-3.5 block lg:hidden">
        <span class="mb-1.5 block text-[13px] font-bold text-encre">Numéro Mobile Money</span>
        <UiChampTelephone v-model="numeroMobileMoney" :pays="auth.utilisateur?.pays" />
      </label>

      <UiBaseButton class="mb-3 w-full" variante="sombre" taille="lg" @click="payer">
        {{ etat === 'echec' ? 'Réessayer le paiement' : `Payer ${formatFcfa(montant, true)}` }}
      </UiBaseButton>
      <p class="rounded-[12px] border border-alerte-bordure bg-alerte-pale p-3.5 text-[13px] leading-[1.55] text-alerte-fonce">
        ⚠ <b>Ne fermez pas cette page</b> avant la confirmation du paiement. Les paiements Mobile Money
        peuvent nécessiter une validation sur votre téléphone.
      </p>
      <p class="mt-3 text-center text-[12.5px] text-discret">
        Le règlement est traité par FeexPay. L’interface de paiement est fournie par le prestataire.
      </p>

      <label v-if="dev" class="mt-6 block rounded-[10px] border border-dashed border-ligne p-3 text-[12.5px] text-discret">
        <span class="font-bold text-texte">Développement — simuler un échec :</span>
        <select v-model="simulerEchec" class="ml-2 rounded border border-ligne bg-white px-2 py-1 text-[12.5px]">
          <option value="">aucun (paiement réussi)</option>
          <option v-for="code in CAS_ECHEC_MAQUETTE" :key="code" :value="code">{{ ECHECS_PAIEMENT[code].titre }}</option>
        </select>
      </label>
    </template>

    <div v-else-if="etat === 'attente' || etat === 'verification'" class="rounded-carte border border-ligne-douce p-7 text-center">
      <p class="font-title text-[24px] font-light">
        {{ etat === 'attente' ? 'En attente de validation' : 'Vérification du paiement' }}
      </p>
      <p class="mt-3 text-[15px] text-texte">{{ message || 'Merci de patienter quelques instants.' }}</p>
      <p class="mt-4 text-[13px] text-alerte">
        ⚠ Validez la demande de paiement sur votre téléphone puis revenez ici. Ne fermez pas la page.
      </p>
    </div>

    <div v-else-if="etat === 'feexpay'" class="rounded-carte border border-ligne-douce p-7 text-center">
      <p class="font-title text-[24px] font-light">Paiement sécurisé FeexPay</p>
      <p class="mt-3 text-[15px] text-texte">
        Suivez les instructions dans la fenêtre FeexPay. Si elle ne s’est pas ouverte, cliquez sur le bouton ci-dessous.
      </p>
      <div :id="CONTENEUR_FEEXPAY" class="mt-6 flex justify-center" />
      <p class="mt-4 text-[12.5px] text-discret">
        Aucun accès n’est ouvert tant que le paiement n’est pas confirmé par FeexPay.
      </p>
      <button type="button" class="mt-4 text-[14px] text-discret hover:underline" @click="changerDeMoyen">
        Annuler et changer de moyen de paiement
      </button>
    </div>

    <div v-else class="text-center">
      <p class="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-succes-voile text-[28px] text-whatsapp" aria-hidden="true">✓</p>
      <p class="mb-2 font-title text-[23px] font-light">Paiement confirmé</p>
      <p class="text-[14px] leading-relaxed text-texte">
        <template v-if="seance">Votre séance de coaching privé est confirmée. Le lien de la salle apparaît dans votre espace le jour J.</template>
        <template v-else>Votre module est maintenant accessible à vie depuis votre espace apprenant.</template>
      </p>
      <p v-if="achat.reference" class="mt-2 font-mono text-[13px] text-discret">
        Référence {{ achat.reference }}
      </p>
      <UiBaseButton
        :to="seance ? '/mon-espace/coaching-prive' : `/mon-espace/module/${achat.module?.slug}`"
        class="mt-5 w-full"
        variante="sombre"
        taille="lg"
        @click="achat.vider()"
      >
        {{ seance ? 'Voir ma séance' : 'Accéder à mon module' }}
      </UiBaseButton>
    </div>
  </div>
</template>
