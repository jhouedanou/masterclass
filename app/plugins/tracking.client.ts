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
 *   — les pages privées ne sont pas mesurées : l'espace apprenant et le
 *     back-office n'ont rien à faire dans une audience publicitaire ;
 *   — le tunnel d'achat, lui, l'est : Big Five suit la conversion de la fiche
 *     module jusqu'au paiement (demande du 23/10). Les événements eux-mêmes
 *     sont émis par les pages, voir app/composables/useSuivi.ts.
 */
export default defineNuxtPlugin(() => {
  const { consentement, lire } = useConsentement()
  const { suivre } = useSuivi()
  const route = useRoute()
  const router = useRouter()

  // Les pages de compte restent exclues : un lien de réinitialisation ou
  // d'invitation porte son jeton dans l'URL, que GA4 enverrait tel quel
  // (`page_location`) à Google et à toute balise du conteneur. `/achat` et
  // `/inscription` n'en portent aucun.
  const PRIVEES = /^\/(admin|mon-espace|formateur|apercu|connexion|mot-de-passe-oublie|reinitialiser-mot-de-passe)/

  let gtmCharge = false
  let pixelCharge = false
  type Identifiants = { gtmConteneur: string; metaPixelId: string; codePersonnalise: string }
  // Une seule lecture, partagée : le chargement après hydratation et la
  // première navigation peuvent se croiser.
  let lecture: Promise<Identifiants | null> | null = null

  type Fenetre = Window & {
    dataLayer?: unknown[]
    fbq?: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown }
    _fbq?: unknown
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
    if (PRIVEES.test(route.path)) return

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

      // Le code additionnel de l'écran 19. Il est saisi par un administrateur
      // supérieur et s'exécute sur toutes les pages publiques : c'est ce qu'on
      // attend d'un champ « scripts additionnels », et c'est exactement pourquoi
      // son écriture lui est réservée.
      if (ids.codePersonnalise?.trim()) {
        const conteneur = document.createElement('div')
        conteneur.innerHTML = ids.codePersonnalise
        for (const balise of conteneur.querySelectorAll('script')) {
          const copie = document.createElement('script')
          for (const attribut of balise.attributes) copie.setAttribute(attribut.name, attribut.value)
          copie.textContent = balise.textContent
          document.head.appendChild(copie)
        }
      }
    }

    if (choix.marketing && ids.metaPixelId && !pixelCharge) {
      pixelCharge = true
      chargerPixel(ids.metaPixelId)
    }
  }

  // GA4 suit seul les changements de page (mesure améliorée, historique du
  // navigateur) ; le Pixel, lui, doit être prévenu de chaque navigation.
  router.afterEach((vers, depuis) => {
    if (!pixelCharge || vers.path === depuis.path || PRIVEES.test(vers.path)) return
    suivre('PageView')
  })

  // Après l'hydratation, puis à chaque changement de consentement. Une
  // navigation depuis une page privée vers une page publique charge aussi.
  onNuxtReady(() => void charger())
  watch(consentement, () => void charger())
  router.afterEach(() => {
    if (!gtmCharge || !pixelCharge) void charger()
  })
})
