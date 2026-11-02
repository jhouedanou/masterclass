/**
 * Chargement des traqueurs, après consentement.
 *
 * L'écran « Tracking & pixels » annonçait une injection dans le `<head>` de
 * toutes les pages ; rien n'était posé nulle part. C'est fait ici, et
 * seulement ici.
 *
 * Quatre règles :
 *
 *   — rien ne part avant que le visiteur ait tranché, et rien ne part s'il
 *     refuse : GTM (et GA4 qu'il porte) attend le consentement « mesure », le
 *     Pixel Meta le consentement « marketing » ;
 *   — le chargement est différé après l'hydratation, pour ne pas retarder
 *     l'affichage sur une connexion mobile ;
 *   — les pages privées n'entrent dans aucune audience : ni page vue GA4, ni
 *     Pixel. Seule exception, l'espace apprenant accepte GTM pour les
 *     événements pédagogiques (GA4 seulement, brief du 02/11) ;
 *   — le tunnel d'achat, lui, est mesuré : Big Five suit la conversion de la
 *     fiche module jusqu'au paiement (demande du 23/10). Les événements
 *     eux-mêmes sont émis par les pages, voir app/composables/useSuivi.ts.
 *
 * Les pages vues GA4 partent d'ici (`page_view` dans le `dataLayer`), pas de
 * la mesure améliorée de GA4 : celle-ci suivait l'historique du navigateur
 * et comptait aussi `/mon-espace` ou `/admin` après une navigation interne.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const { consentement, lire } = useConsentement()
  const { suivre } = useSuivi()
  const route = useRoute()
  const router = useRouter()

  // Les pages de compte restent exclues : un lien de réinitialisation ou
  // d'invitation porte son jeton dans l'URL, que GA4 enverrait tel quel
  // (`page_location`) à Google et à toute balise du conteneur. `/achat` et
  // `/inscription` n'en portent aucun.
  const PRIVEES = /^\/(admin|mon-espace|formateur|apercu|connexion|mot-de-passe-oublie|reinitialiser-mot-de-passe)/
  // Parmi elles, l'espace apprenant charge GTM (consentement « mesure ») pour
  // les seuls événements pédagogiques. Ses adresses ne portent aucun jeton.
  const ESPACE_APPRENANT = /^\/mon-espace(\/|$)/
  const sansGtm = (chemin: string) => PRIVEES.test(chemin) && !ESPACE_APPRENANT.test(chemin)

  let gtmCharge = false
  let pixelCharge = false
  let codeCharge = false
  type Identifiants = { gtmConteneur: string; metaPixelId: string; codePersonnalise: string }
  // Une seule lecture, partagée : le chargement après hydratation et la
  // première navigation peuvent se croiser.
  let lecture: Promise<Identifiants | null> | null = null

  type Fenetre = Window & {
    dataLayer?: unknown[]
    fbq?: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown }
    _fbq?: unknown
  }

  // Le nonce de la page (server/plugins/csp.ts). Posé sur gtm.js, il est
  // reporté par GTM sur les scripts qu'il ajoute ; posé sur les copies du
  // code additionnel, il les fait admettre comme les scripts de Nuxt. Le
  // navigateur vide l'attribut, mais la propriété `nonce` garde la valeur.
  function nonceDeLaPage(): string | undefined {
    return document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce || undefined
  }

  /** `gtag()` du mode Consentement : GTM lit des `arguments`, pas des tableaux. */
  function gtag(..._args: unknown[]) {
    const w = window as Fenetre
    w.dataLayer = w.dataLayer ?? []
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer.push(arguments)
  }

  function etatsConsentement(choix: { mesure: boolean; marketing: boolean }) {
    const marketing = choix.marketing ? 'granted' : 'denied'
    return {
      analytics_storage: choix.mesure ? 'granted' : 'denied',
      ad_storage: marketing,
      ad_user_data: marketing,
      ad_personalization: marketing,
    }
  }

  function chargerGtm(conteneur: string, choix: { mesure: boolean; marketing: boolean }) {
    const w = window as Fenetre
    // Mode Consentement v2 : l'état part avant le conteneur, pour que les
    // balises Google qu'il porte s'y conforment dès leur premier appel.
    gtag('consent', 'default', { ...etatsConsentement({ mesure: false, marketing: false }), wait_for_update: 500 })
    gtag('consent', 'update', etatsConsentement(choix))
    w.dataLayer!.push({ 'gtm.start': Date.now(), event: 'gtm.js' })

    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(conteneur)}`
    const nonce = nonceDeLaPage()
    if (nonce) script.nonce = nonce
    document.head.appendChild(script)
  }

  /** Le chargeur officiel du Pixel, réécrit sans `eval` : une file `fbq` qui
   *  retient les appels jusqu'à l'arrivée de `fbevents.js`. */
  function chargerPixel(pixelId: string) {
    const w = window as Fenetre
    if (!w.fbq) {
      const fbq = function (...args: unknown[]) {
        if (fbq.callMethod) fbq.callMethod(...args)
        else fbq.queue!.push(args)
      } as NonNullable<Fenetre['fbq']>
      fbq.push = fbq
      fbq.loaded = true
      fbq.version = '2.0'
      fbq.queue = []
      w.fbq = fbq
      w._fbq = fbq
      const script = document.createElement('script')
      script.async = true
      script.src = 'https://connect.facebook.net/en_US/fbevents.js'
      const nonce = nonceDeLaPage()
      if (nonce) script.nonce = nonce
      document.head.appendChild(script)
    }
    // Pas d'appariement avancé ici : l'e-mail et le téléphone partent hachés
    // par l'API Conversions, côté serveur, jamais depuis le navigateur.
    w.fbq('init', pixelId)
    // Directement, avant que la file de useSuivi se vide : la page vue
    // précède les événements qu'elle a émis en attendant le Pixel.
    w.fbq('track', 'PageView')
  }

  async function charger() {
    if (sansGtm(route.path)) return

    const choix = consentement.value ?? lire()
    if (!choix) return
    await poser(choix)
    // Traqueurs posés, ou écartés faute de consentement : les événements
    // retenus partent, ou se perdent sans rien envoyer.
    libererSuivi()
  }

  async function poser(choix: { mesure: boolean; marketing: boolean }) {
    // Choix revu depuis le bandeau, traqueurs déjà posés : ils reçoivent le
    // nouvel état, refus compris.
    if (gtmCharge) gtag('consent', 'update', etatsConsentement(choix))
    if (pixelCharge) (window as Fenetre).fbq?.('consent', choix.marketing ? 'grant' : 'revoke')

    if (!choix.mesure && !choix.marketing) return

    lecture = lecture ?? $fetch<Identifiants>('/api/tracking').catch(() => null)
    const ids = await lecture
    if (!ids) {
      lecture = null
      return
    }

    if (choix.mesure && ids.gtmConteneur && !gtmCharge) {
      gtmCharge = true
      chargerGtm(ids.gtmConteneur, choix)
      pageVue()
    }

    // Ni Pixel ni code additionnel dans l'espace apprenant : ils l'attendront
    // sur la prochaine page publique.
    if (PRIVEES.test(route.path)) return

    if (choix.marketing && ids.metaPixelId && !pixelCharge) {
      pixelCharge = true
      chargerPixel(ids.metaPixelId)
    }

    // Le code additionnel de l'écran 19. Il est saisi par un administrateur
    // supérieur et s'exécute sur toutes les pages publiques : c'est ce qu'on
    // attend d'un champ « scripts additionnels », et c'est exactement pourquoi
    // son écriture lui est réservée. Il sert d'ordinaire à poser d'autres
    // pixels publicitaires (TikTok, LinkedIn) : il attend donc le consentement
    // « marketing », comme le Pixel Meta.
    if (choix.marketing && ids.codePersonnalise?.trim() && !codeCharge) {
      codeCharge = true
      const conteneur = document.createElement('div')
      conteneur.innerHTML = ids.codePersonnalise
      const nonce = nonceDeLaPage()
      for (const balise of conteneur.querySelectorAll('script')) {
        const copie = document.createElement('script')
        for (const attribut of balise.attributes) copie.setAttribute(attribut.name, attribut.value)
        if (nonce) copie.nonce = nonce
        copie.textContent = balise.textContent
        document.head.appendChild(copie)
      }
    }
  }

  /** Page vue GA4, pages publiques seulement, une fois par adresse. Le titre
   *  est lu après la mise à jour du `<head>` par la page. */
  let derniereVue = ''
  function pageVue() {
    if (!gtmCharge || PRIVEES.test(route.path) || route.fullPath === derniereVue) return
    derniereVue = route.fullPath
    ;(window as Fenetre).dataLayer!.push({
      event: 'page_view',
      page_location: window.location.origin + route.fullPath,
      page_title: document.title,
    })
  }

  // Le Pixel doit être prévenu de chaque navigation ; GA4 aussi, une fois le
  // titre de la nouvelle page posé.
  router.afterEach((vers, depuis) => {
    if (!pixelCharge || vers.path === depuis.path || PRIVEES.test(vers.path)) return
    suivre('PageView')
  })
  nuxtApp.hook('page:finish', () => {
    setTimeout(pageVue, 0)
  })

  // Après l'hydratation, puis à chaque changement de consentement. Une
  // navigation depuis une page privée vers une page publique charge aussi.
  onNuxtReady(() => void charger())
  watch(consentement, () => void charger())
  router.afterEach(() => {
    if (!gtmCharge || !pixelCharge || !codeCharge) void charger()
  })
})
