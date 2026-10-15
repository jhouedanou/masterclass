<script setup lang="ts">
import type { CodeEchecPaiement } from '#shared/types'

definePageMeta({ middleware: 'auth' })

const achat = useAchatStore()
const auth = useAuthStore()
const config = useRuntimeConfig()
const route = useRoute()
/** Numéro Mobile Money ou Wave (planche A, 04c), transmis à la fenêtre FeexPay. */
const numeroMobileMoney = ref(auth.utilisateur?.whatsapp ?? '')

/**
 * Chaque moyen porte ses propres consignes. La recette du 13/10 (ACH-05) a
 * relevé que Wave et Djamo se comportaient en tout point comme Mobile Money :
 * même absence d'explication, même message « validez sur votre téléphone ».
 * `numero` : le moyen se règle depuis un numéro, saisi ici et transmis à
 * FeexPay pour pré-remplir sa fenêtre.
 */
const moyens = [
  {
    valeur: 'mobile-money',
    libelle: 'Mobile Money',
    detail: 'Orange Money, MTN MoMo ou Moov Money',
    numero: 'Numéro Mobile Money',
    consigne: 'Une demande de paiement arrive sur votre téléphone : validez-la avec votre code secret.',
    attente: 'Validez la demande de paiement sur votre téléphone avec votre code secret Mobile Money, puis revenez ici.',
  },
  {
    valeur: 'wave',
    libelle: 'Wave',
    detail: 'Depuis votre application Wave',
    numero: 'Numéro Wave',
    consigne: 'Scannez le QR code affiché par FeexPay avec l’application Wave, ou validez la notification reçue sur votre numéro Wave.',
    attente: 'Ouvrez l’application Wave, validez le paiement, puis revenez ici.',
  },
  {
    valeur: 'djamo',
    libelle: 'Djamo',
    detail: 'Carte ou compte Djamo',
    numero: null,
    carte: true,
    consigne: 'Saisissez les informations de votre carte Djamo dans la fenêtre FeexPay, puis confirmez dans l’application Djamo si elle vous le demande.',
    attente: 'Confirmez le paiement dans l’application Djamo si une demande s’affiche, puis revenez ici.',
  },
  {
    valeur: 'visa',
    libelle: 'Visa',
    detail: 'Carte bancaire Visa ou Mastercard',
    numero: null,
    carte: true,
    consigne: 'Saisissez les informations de votre carte dans la fenêtre sécurisée FeexPay. Votre banque peut demander une confirmation (3-D Secure).',
    attente: 'Confirmez le paiement auprès de votre banque si elle vous le demande, puis revenez ici.',
  },
] as const

/** Les quatre moyens restent affichés. Un moyen que FeexPay n'a pas encore
 *  ouvert sur le compte (Wave : `FEEXPAY_WAVE_ACTIVE` ; Visa et Djamo, par
 *  carte : `FEEXPAY_CARTE_ACTIVE`) dit pourquoi au lieu de disparaître, et
 *  renvoie vers le Mobile Money. Le serveur refuse de toute façon de l'ouvrir. */
const moyensProposes = moyens
if (!moyens.some((m) => m.valeur === achat.moyen)) achat.moyen = 'mobile-money'

const moyenChoisi = computed(() => moyens.find((m) => m.valeur === achat.moyen) ?? moyens[0])

function indisponibilite(valeur: string): string | null {
  if (valeur === 'wave' && !config.public.feexpayWaveActive) {
    return 'Wave n’est pas encore ouvert sur notre compte de paiement : FeexPay doit activer Wave pour Big Five. En attendant, payez par Mobile Money (Orange, MTN ou Moov).'
  }
  if ((valeur === 'visa' || valeur === 'djamo') && !config.public.feexpayCarteActive) {
    return 'Le paiement par carte (Visa, Mastercard, Djamo) est en cours d’activation : FeexPay valide le dossier carte de Big Five. En attendant, payez par Mobile Money (Orange, MTN ou Moov).'
  }
  return null
}
const indisponible = computed(() => indisponibilite(achat.moyen))

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
  cas: 'MOBILE' | 'WALLET' | 'CARD' | ''
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
  /** Le SDK expose de quoi refermer ses propres fenêtres ; il ne le fait pas
   *  de lui-même une fois le paiement abouti. */
  hideResultModal?: () => void
  hidePaymentModal?: () => void
}

/**
 * Referme les fenêtres de FeexPay.
 *
 * Le SDK appelle bien notre rappel sur un paiement réussi, mais laisse sa
 * fenêtre de résultat par-dessus la page : le tunnel se terminait derrière un
 * voile que rien ne permettait d'écarter, et l'achat paraissait bloqué alors
 * qu'il était déjà confirmé.
 *
 * Les deux fonctions publiques d'abord ; le retrait des voiles ensuite, au cas
 * où une version du SDK les nommerait autrement — nous ne maîtrisons pas ce
 * fichier, servi par le prestataire et susceptible de changer sans préavis.
 */
let minuteurFermeture: ReturnType<typeof setTimeout> | undefined

function fermerFenetresFeexPay() {
  const passe = () => {
    const sdk = (window as unknown as { FeexPayButton?: FeexPayButtonGlobal }).FeexPayButton
    try {
      sdk?.hideResultModal?.()
      sdk?.hidePaymentModal?.()
    } catch {
      // Une fermeture qui échoue ne doit pas emporter la confirmation.
    }
    for (const voile of document.querySelectorAll(
      '.feexpay-modal-overlay, .feexpay-otp-modal-overlay, .feexpay-result-modal-overlay',
    )) {
      voile.remove()
    }
  }

  passe()
  // Seconde passe : le SDK dresse sa fenêtre de succès au moment même où il
  // nous rappelle, et l'ordre des deux n'est pas garanti. Fermer une seule
  // fois laisserait le voile en place si elle arrivait après nous.
  clearTimeout(minuteurFermeture)
  minuteurFermeture = setTimeout(passe, 400)
}

const feexpayActif = config.public.feexpayActif
if (feexpayActif) {
  useHead({ script: [{ src: config.public.feexpaySdkUrl, defer: true }] })
}

const CONTENEUR_FEEXPAY = 'feexpay-bouton'
/** Référence de la commande en cours de règlement. */
const commandeEnCours = ref<string | null>(null)
let minuteurVerification: ReturnType<typeof setTimeout> | undefined

/**
 * Garde contre une page vide du SDK. Pour Wave et Orange, le SDK ouvre en
 * plein écran un cadre sur l'adresse de paiement renvoyée par FeexPay, sans
 * vérifier qu'il l'a reçue : quand FeexPay refuse (« Wave aggregated merchant
 * not configured », recette du 15/10), le cadre charge `/achat/undefined` et
 * le client voit notre page 404 par-dessus le tunnel. On retire ce cadre et on
 * affiche un échec lisible.
 */
let gardeCadre: MutationObserver | undefined

function surveillerCadreVide() {
  gardeCadre?.disconnect()
  gardeCadre = new MutationObserver(() => {
    for (const cadre of document.querySelectorAll('iframe')) {
      // `iframe.src = undefined` écrit littéralement « undefined » dans l'attribut.
      const src = cadre.getAttribute('src')
      if (src !== 'undefined' && src !== 'null') continue
      ;(cadre.parentElement ?? cadre).remove()
      gardeCadre?.disconnect()
      afficherEchec(
        'erreur-inconnue',
        achat.moyen === 'wave'
          ? 'FeexPay a refusé d’ouvrir le paiement Wave : Wave n’est pas activé sur notre compte. Payez par Mobile Money.'
          : 'FeexPay n’a pas pu ouvrir ce moyen de paiement. Choisissez-en un autre ou réessayez plus tard.',
      )
      return
    }
  })
  gardeCadre.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] })
}

/**
 * Adresses de retour des pages hébergées (Orange Money, Wave). L'API accepte
 * `return_url` et `cancel_url` (docs.feexpay.me), mais le SDK ne les envoie
 * pas pour Orange : après paiement, la page Orange ramenait le client sur
 * app-v2.feexpay.me au lieu du site (recette du 15/10). On complète donc sa
 * requête au vol, et on garde la référence FeexPay renvoyée, qu'Orange
 * n'ajoute pas forcément à l'adresse de retour.
 */
const CLE_REFERENCE_FEEXPAY = 'reference-feexpay'
let fetchOriginal: typeof window.fetch | undefined
/** La commande en cours : une nouvelle tentative en ouvre une autre. */
let commandeRetour = ''

function completerRequetesFeexPay(commande: string) {
  commandeRetour = commande
  if (fetchOriginal) return
  fetchOriginal = window.fetch
  const origine = fetchOriginal
  window.fetch = async (entree, options) => {
    const url = typeof entree === 'string' ? entree : entree instanceof URL ? entree.href : entree.url
    if (!url.includes('/api/transactions/requesttopay/') || typeof options?.body !== 'string') {
      return origine(entree, options)
    }
    let corps: Record<string, unknown> | null = null
    try {
      corps = JSON.parse(options.body)
    } catch {
      return origine(entree, options)
    }
    const reponse = await origine(entree, {
      ...options,
      body: JSON.stringify({ ...corps, return_url: urlRetour(commandeRetour), cancel_url: urlRetour(commandeRetour, 'echec') }),
    })
    try {
      const lu = await reponse.clone().json()
      if (typeof lu?.reference === 'string') {
        sessionStorage.setItem(CLE_REFERENCE_FEEXPAY, JSON.stringify({ commande: commandeRetour, reference: lu.reference }))
      }
    } catch {
      // Réponse illisible ou stockage indisponible : la recherche par commande suffit.
    }
    return reponse
  }
}

function referenceMiseDeCote(commande: string): string | null {
  try {
    const mis = JSON.parse(sessionStorage.getItem(CLE_REFERENCE_FEEXPAY) ?? 'null')
    return mis?.commande === commande && typeof mis.reference === 'string' ? mis.reference : null
  } catch {
    return null
  }
}

onBeforeUnmount(() => {
  if (minuteurVerification) clearTimeout(minuteurVerification)
  if (minuteurFermeture) clearTimeout(minuteurFermeture)
  gardeCadre?.disconnect()
  if (fetchOriginal) window.fetch = fetchOriginal
  fetchOriginal = undefined
})

async function attendreSdk(): Promise<FeexPayButtonGlobal> {
  for (let i = 0; i < 50; i += 1) {
    const sdk = (window as unknown as { FeexPayButton?: FeexPayButtonGlobal }).FeexPayButton
    if (sdk) return sdk
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error('Le module de paiement FeexPay ne s’est pas chargé.')
}

/** L'issue annoncée par le SDK. Un échec déclaré n'a pas à être confirmé
 *  pendant deux minutes auprès du serveur. */
function issueDepuisRappel(reponse: unknown): string | null {
  if (!reponse || typeof reponse !== 'object') return null
  const r = reponse as Record<string, unknown>
  const source = (r.data && typeof r.data === 'object' ? r.data : r) as Record<string, unknown>
  return typeof source.status === 'string' ? source.status.toUpperCase() : null
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

// --- Retour de la page hébergée (carte) -------------------------------------

/** Clé de l'achat mis de côté le temps du détour par FeexPay. */
const CLE_ACHAT_EN_COURS = 'achat-en-cours'

function urlRetour(commande: string, issue?: 'echec') {
  const url = new URL('/achat/paiement', window.location.origin)
  url.searchParams.set('retour', commande)
  if (issue) url.searchParams.set('issue', issue)
  return url.toString()
}

/**
 * Le store d'achat ne survit pas au départ vers FeexPay : la page est
 * rechargée au retour. L'achat est donc mis de côté dans l'onglet (le
 * sessionStorage suit l'onglet, même après un passage sur un autre site) pour
 * que l'écran de succès mène au bon module et que « Réessayer » fonctionne.
 */
function mettreAchatDeCote(commande: string) {
  try {
    sessionStorage.setItem(
      CLE_ACHAT_EN_COURS,
      JSON.stringify({ commande, module: achat.module, seance: achat.seance, moyen: achat.moyen }),
    )
  } catch {
    // Stockage indisponible (navigation privée) : le retour mènera à l'espace.
  }
}

function reprendreAchatMisDeCote(commande: string) {
  try {
    const brut = sessionStorage.getItem(CLE_ACHAT_EN_COURS)
    const mis = brut ? JSON.parse(brut) : null
    if (mis?.commande !== commande) return
    if (mis.seance) achat.definirSeance(mis.seance)
    else if (mis.module) achat.definir(mis.module)
    if (moyens.some((m) => m.valeur === mis.moyen)) achat.moyen = mis.moyen
  } catch {
    // Rien à reprendre : la vérification se fait sur la seule référence.
  }
}

/** FeexPay ne documente pas les paramètres qu'il ajoute au retour : on prend
 *  sa référence sous les noms usuels, sinon la recherche par commande suffit. */
function referenceDepuisRetour(): string | null {
  const query = route.query
  for (const cle of ['reference', 'transaction_id', 'transactionId', 'ref']) {
    const v = query[cle]
    if (typeof v === 'string' && v) return v
  }
  return null
}

function reprendreApresRedirection() {
  const { retour, issue } = route.query
  if (typeof retour !== 'string' || !retour) return
  reprendreAchatMisDeCote(retour)
  commandeEnCours.value = retour
  void confirmer(referenceDepuisRetour() ?? referenceMiseDeCote(retour), 0, issue === 'echec')
}

onMounted(reprendreApresRedirection)

async function ouvrirFeexPay(parametres: ParametresFeexPay) {
  mettreAchatDeCote(parametres.customId)
  etat.value = 'feexpay'
  message.value = 'La fenêtre de paiement FeexPay s’ouvre.'
  await nextTick()
  const sdk = await attendreSdk()
  surveillerCadreVide()
  completerRequetesFeexPay(parametres.customId)
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
    // Le numéro n'a de sens que pour un moyen qui se règle par numéro.
    phone: (moyenChoisi.value.numero && numeroMobileMoney.value) || undefined,
    // La fenêtre s'ouvre sur la Côte d'Ivoire et le seul réseau choisi ici :
    // sans ce filtre, elle part du Bénin et le client doit tout choisir à
    // nouveau (recette du 15/10).
    networks:
      parametres.cas === 'MOBILE' ? { 'Côte d\'Ivoire': ['MTN', 'ORANGE', 'MOOV'] }
        : parametres.cas === 'WALLET' ? { 'Côte d\'Ivoire': ['WAVE'] }
          : undefined,
    callback_info: { commande: parametres.customId },
    // La carte ne se règle pas dans la fenêtre : le SDK envoie le client sur
    // la page hébergée de FeexPay, d'où le prestataire le ramène ici. Le
    // rappel `callback` ne sera donc jamais appelé : c'est le retour sur ces
    // adresses qui relance la vérification (`reprendreApresRedirection`).
    callback_url: urlRetour(parametres.customId),
    error_callback_url: urlRetour(parametres.customId, 'echec'),
    callback: (reponse: unknown) => {
      // La fenêtre se referme dans tous les cas : réussite comme échec, la
      // suite se joue sur notre page.
      fermerFenetresFeexPay()
      const issue = issueDepuisRappel(reponse)
      const reference = referenceDepuisRappel(reponse)
      // Un échec annoncé par le SDK : avec sa référence, le serveur lit le motif
      // chez FeexPay, le traduit (« LOW_BALANCE… » → solde insuffisant) et
      // trace la transaction en échec — sans lui, elle restait « en attente »
      // et l'écran disait seulement « erreur chez le prestataire » (recette du
      // 15/10). Sans référence, rien à vérifier : l'échec est affiché tel quel.
      if (issue && issue !== 'SUCCESSFUL' && issue !== 'PENDING') {
        if (reference) void confirmer(reference)
        else afficherEchec('erreur-inconnue', ECHECS_PAIEMENT['erreur-inconnue'].message, null)
        return
      }
      void confirmer(reference)
    },
  })
  // Le SDK rend son propre bouton dans le conteneur : on l'actionne pour
  // l'utilisateur, qui vient déjà de cliquer « Payer ». S'il ne répond pas,
  // le bouton reste visible.
  await nextTick()
  const bouton = document.querySelector<HTMLElement>(`#${CONTENEUR_FEEXPAY} button`)
  bouton?.click()
  void preremplirFeexPay(parametres)
}

/**
 * Le SDK ignore `first_name`, `email` et `phone` : le client retapait dans la
 * fenêtre FeexPay ce qu'il venait de saisir ici (recette du 15/10). On remplit
 * donc ses champs une fois la fenêtre ouverte, opérateur compris (déduit du
 * numéro : 01 Moov, 05 MTN, 07 Orange). Si le SDK change ses champs, rien ne
 * casse : le client les remplit lui-même, comme avant.
 */
async function preremplirFeexPay(parametres: ParametresFeexPay) {
  const ecrire = (champ: HTMLInputElement | HTMLSelectElement | null, valeur: string) => {
    if (!champ || !valeur || champ.value) return
    champ.value = valeur
    champ.dispatchEvent(new Event('input', { bubbles: true }))
    champ.dispatchEvent(new Event('change', { bubbles: true }))
  }
  const chiffres = (moyenChoisi.value.numero ? numeroMobileMoney.value : '').replace(/\D/g, '')
  const national = chiffres.startsWith('225') && chiffres.length === 13 ? chiffres.slice(3) : chiffres
  const operateur = ({ '01': 'MOOV', '05': 'MTN', '07': 'ORANGE' } as Record<string, string>)[national.slice(0, 2)]

  // La fenêtre se construit après la validation de la boutique : on l'attend.
  for (let i = 0; i < 20; i += 1) {
    if (document.getElementById('feexpay-name-input')) break
    await new Promise((r) => setTimeout(r, 150))
  }
  ecrire(document.querySelector<HTMLInputElement>('#feexpay-name-input'), `${parametres.prenom} ${parametres.nom}`.trim())
  ecrire(document.querySelector<HTMLInputElement>('#feexpay-email-input'), parametres.email)
  if (national.length !== 10) return

  const reseau = document.querySelector<HTMLSelectElement>('#feexpay-network-select')
  if (reseau && operateur && [...reseau.options].some((o) => o.value === operateur)) {
    reseau.value = operateur
    reseau.dispatchEvent(new Event('change', { bubbles: true }))
  }
  const champsNumero = [
    document.querySelector<HTMLInputElement>('#feexpay-wallet-phone-input'),
    ...document.querySelectorAll<HTMLInputElement>('.feexpay-modal input[placeholder*="léphone"]'),
  ].filter((c): c is HTMLInputElement => !!c && c.offsetParent !== null)
  for (const champ of champsNumero) ecrire(champ, national)
}

/** Vérification serveur, relancée toutes les trois secondes tant que FeexPay
 *  n'a pas tranché (deux minutes au plus). */
async function confirmer(referenceFeexPay: string | null, essai = 0, echecAnnonce = false) {
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
      fermerFenetresFeexPay()
      try {
        sessionStorage.removeItem(CLE_ACHAT_EN_COURS)
      } catch {
        // Sans stockage, rien à effacer.
      }
      etat.value = 'succes'
      return
    }
    // Retour par l'adresse d'échec de la page carte : le serveur n'a pas
    // encore le motif, mais il n'y a rien à attendre pendant deux minutes.
    if (echecAnnonce) {
      // Retour par l'adresse d'échec : carte refusée pour un paiement par
      // carte, sinon le client a quitté ou refusé la page Orange ou Wave.
      const code = 'carte' in moyenChoisi.value ? 'carte-refusee' : 'annule-utilisateur'
      afficherEchec(code, ECHECS_PAIEMENT[code].message, referenceFeexPay)
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
  fermerFenetresFeexPay()
  etat.value = 'echec'
  tentatives.value += 1
  codeEchec.value = code
  // Un motif connu a son message rédigé. Pour un motif inconnu, on garde le
  // texte précis quand il y en a un (moyen non activé, refus serveur) ; un
  // code brut de FeexPay est cité tel quel, pour que l'équipe puisse le
  // retrouver.
  const redige = ECHECS_PAIEMENT[code]?.message ?? texte
  message.value =
    code !== 'erreur-inconnue' || !texte || texte === redige
      ? redige
      : /^[A-Z0-9_ ]+$/.test(texte)
        ? `${redige} Motif communiqué par FeexPay : ${texte}.`
        : texte
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
          {{ echec.titre }}
        </p>
        <p class="mt-1 text-[14px] text-texte">
          {{ message }}
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

      <!-- Quatre pavés égaux (un moyen pas encore ouvert porte « Bientôt disponible »), le moyen retenu cerné d'un trait de 2 px : la
           maquette ne montre ni bouton radio ni sous-titre. -->
      <div class="mb-4.5 grid grid-cols-2 gap-3">
        <label
          v-for="moyen in moyensProposes"
          :key="moyen.valeur"
          class="cursor-pointer rounded-[12px] p-4 text-center text-[14px] font-bold"
          :class="achat.moyen === moyen.valeur ? 'border-2 border-social text-encre' : 'border-[1.5px] border-ligne text-texte'"
        >
          <input v-model="achat.moyen" type="radio" :value="moyen.valeur" class="sr-only">
          <span class="block">{{ moyen.libelle }}</span>
          <span class="mt-1 block text-[12px] font-normal text-discret">{{ moyen.detail }}</span>
          <span v-if="indisponibilite(moyen.valeur)" class="mt-1.5 inline-block rounded-full bg-alerte-pale px-2 py-0.5 text-[11px] font-bold text-alerte-fonce">Bientôt disponible</span>
        </label>
      </div>

      <!-- Planche A, écran 04c : le numéro est saisi avant de payer et
           pré-remplit la fenêtre FeexPay. D'abord réservé au mobile et au seul
           Mobile Money, il vaut aussi pour Wave et sur tous les écrans. -->
      <template v-if="indisponible">
        <p class="mb-3.5 rounded-[12px] border border-alerte-bordure bg-alerte-pale p-3.5 text-[13.5px] leading-[1.55] text-alerte-fonce" role="status">
          {{ indisponible }}
        </p>
        <UiBaseButton class="mb-3 w-full" variante="sombre" taille="lg" @click="achat.moyen = 'mobile-money'">
          Payer par Mobile Money
        </UiBaseButton>
      </template>
      <template v-else>
        <p class="mb-3.5 text-[13.5px] leading-[1.55] text-texte">{{ moyenChoisi.consigne }}</p>
        <label v-if="moyenChoisi.numero" class="mb-3.5 block">
          <span class="mb-1.5 block text-[13px] font-bold text-encre">{{ moyenChoisi.numero }}</span>
          <UiChampTelephone v-model="numeroMobileMoney" :pays="auth.utilisateur?.pays" />
        </label>

        <UiBaseButton class="mb-3 w-full" variante="sombre" taille="lg" @click="payer">
          {{ etat === 'echec' ? 'Réessayer le paiement' : `Payer ${formatFcfa(montant, true)}` }}
        </UiBaseButton>
      </template>
      <p class="rounded-[12px] border border-alerte-bordure bg-alerte-pale p-3.5 text-[13px] leading-[1.55] text-alerte-fonce">
        ⚠ <b>Ne fermez pas cette page</b> avant la confirmation du paiement.
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
        ⚠ {{ moyenChoisi.attente }} Ne fermez pas la page.
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
        :to="seance ? '/mon-espace/coaching-prive' : achat.module ? `/mon-espace/module/${achat.module.slug}` : '/mon-espace'"
        class="mt-5 w-full"
        variante="sombre"
        taille="lg"
        @click="achat.vider()"
      >
        {{ seance ? 'Voir ma séance' : achat.module ? 'Accéder à mon module' : 'Accéder à mon espace' }}
      </UiBaseButton>
    </div>
  </div>
</template>
