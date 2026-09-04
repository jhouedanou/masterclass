<script setup lang="ts">
import type { CodeEchecPaiement } from '#shared/types'

definePageMeta({ middleware: 'auth' })

const achat = useAchatStore()
const config = useRuntimeConfig()

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
const tentatives = ref(0)
/** Hors production : permet de dérouler chacun des six cas d'erreur. */
const simulerEchec = ref<CodeEchecPaiement | ''>('')
const dev = import.meta.dev

const echec = computed(() => (codeEchec.value ? ECHECS_PAIEMENT[codeEchec.value] : null))

usePagePrivee('Choisissez votre moyen de paiement')

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
    afficherEchec('delai-depasse', 'FeexPay n’a pas confirmé le paiement dans le délai imparti.')
  } catch (e) {
    const r = e as {
      statusCode?: number
      statusMessage?: string
      data?: { statusMessage?: string; data?: { code?: CodeEchecPaiement } }
    }
    // FeexPay injoignable un instant : on réessaie plutôt que de conclure.
    if (r.statusCode === 502 && essai < 40) {
      minuteurVerification = setTimeout(() => void confirmer(referenceFeexPay, essai + 1), 3000)
      return
    }
    afficherEchec(
      r.data?.data?.code ?? 'erreur-inconnue',
      r.data?.statusMessage ?? r.statusMessage ?? 'Le paiement a échoué.',
    )
  }
}

function afficherEchec(code: CodeEchecPaiement, texte: string) {
  etat.value = 'echec'
  tentatives.value += 1
  codeEchec.value = code
  message.value = texte
}

// --- Tunnel -------------------------------------------------------------------

async function payer() {
  if (!achat.module) return
  etat.value = 'attente'
  message.value = feexpayActif ? 'Ouverture de la commande…' : 'Validez la demande sur votre téléphone.'
  codeEchec.value = null
  try {
    const commande = await $fetch<ReponseCommande>('/api/commandes', {
      method: 'POST',
      body: {
        moduleIds: [achat.module.id],
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
    const r = e as { statusMessage?: string; data?: { statusMessage?: string; data?: { code?: CodeEchecPaiement } } }
    afficherEchec(
      r.data?.data?.code ?? 'erreur-inconnue',
      r.data?.statusMessage ?? r.statusMessage ?? (e as Error).message ?? 'Le paiement a échoué.',
    )
  }
}

function changerDeMoyen() {
  etat.value = 'choix'
  codeEchec.value = null
}
</script>

<template>
  <div class="conteneur max-w-[840px] py-12">
    <UiEtapesAchat :etape="3" />

    <h1 class="mt-8 text-[36px] font-medium">Choisissez votre moyen de paiement</h1>

    <template v-if="etat === 'choix' || etat === 'echec'">
      <div v-if="etat === 'echec' && echec" class="mt-6 rounded-[14px] border border-erreur bg-[#fdeeee] p-5" role="alert">
        <p class="font-title text-[21px] font-light text-erreur-fonce">{{ echec.titre }}</p>
        <p class="mt-1 text-[14px] text-texte">{{ message }}</p>
        <p class="mt-2 text-[14px] text-texte">{{ echec.conseil }}</p>
        <p class="mt-2 text-[12.5px] text-discret">
          Aucun accès n’est ouvert tant que le paiement n’est pas confirmé.
          <template v-if="tentatives >= 2"> Si le problème persiste, notre équipe peut vous aider.</template>
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <UiBaseButton v-if="echec.action !== 'contacter'" taille="sm" @click="payer">Réessayer</UiBaseButton>
          <UiBaseButton v-if="echec.action === 'changer-moyen'" taille="sm" variante="contour" @click="changerDeMoyen">
            Changer de moyen de paiement
          </UiBaseButton>
          <UiBaseButton
            v-if="echec.action === 'contacter' || tentatives >= 2"
            taille="sm"
            variante="whatsapp"
            :href="lienWhatsApp(`Bonjour, mon paiement pour le module « ${achat.module?.titre ?? ''} » a échoué (${echec.titre}).`)"
          >
            Contacter l’équipe
          </UiBaseButton>
        </div>
      </div>

      <div class="mt-8 grid gap-3 sm:grid-cols-2">
        <label
          v-for="moyen in moyens"
          :key="moyen.valeur"
          class="flex cursor-pointer items-start gap-3 rounded-[14px] border p-5"
          :class="achat.moyen === moyen.valeur ? 'border-social' : 'border-ligne'"
        >
          <input v-model="achat.moyen" type="radio" :value="moyen.valeur" class="mt-1">
          <span>
            <span class="block font-title text-[19px] font-light">{{ moyen.libelle }}</span>
            <span class="block text-[13.5px] text-discret">{{ moyen.detail }}</span>
          </span>
        </label>
      </div>

      <UiBaseButton class="mt-7 w-full" taille="lg" @click="payer">
        {{ etat === 'echec' ? 'Réessayer le paiement' : `Payer ${achat.module ? formatFcfa(achat.module.prixFcfa, true) : ''}` }}
      </UiBaseButton>
      <p class="mt-3 text-center text-[13px] text-discret">
        Le règlement est traité par FeexPay. L’interface de paiement est fournie par le prestataire.
      </p>

      <label v-if="dev" class="mt-6 block rounded-[10px] border border-dashed border-ligne p-3 text-[12.5px] text-discret">
        <span class="font-bold text-texte">Développement — simuler un échec :</span>
        <select v-model="simulerEchec" class="ml-2 rounded border border-ligne bg-white px-2 py-1 text-[12.5px]">
          <option value="">aucun (paiement réussi)</option>
          <option v-for="(e, code) in ECHECS_PAIEMENT" :key="code" :value="code">{{ e.titre }}</option>
        </select>
      </label>
    </template>

    <div v-else-if="etat === 'attente' || etat === 'verification'" class="mt-10 rounded-carte border border-ligne-douce p-10 text-center">
      <p class="font-title text-[24px] font-light">
        {{ etat === 'attente' ? 'En attente de validation' : 'Vérification du paiement' }}
      </p>
      <p class="mt-3 text-[15px] text-texte">{{ message || 'Merci de patienter quelques instants.' }}</p>
    </div>

    <div v-else-if="etat === 'feexpay'" class="mt-10 rounded-carte border border-ligne-douce p-10 text-center">
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

    <div v-else class="mt-10 rounded-carte border border-succes bg-succes-voile p-10 text-center">
      <p class="font-title text-[27px] font-light text-succes">Paiement confirmé</p>
      <p class="mt-3 text-[15px] text-texte">
        Votre module est maintenant accessible à vie depuis votre espace apprenant.
      </p>
      <p v-if="achat.reference" class="mt-2 font-mono text-[13px] text-discret">
        Référence {{ achat.reference }}
      </p>
      <UiBaseButton
        :to="`/mon-espace/module/${achat.module?.slug}`"
        class="mt-6"
        taille="lg"
        @click="achat.vider()"
      >
        Accéder à mon module
      </UiBaseButton>
    </div>
  </div>
</template>
