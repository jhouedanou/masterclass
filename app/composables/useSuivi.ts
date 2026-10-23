/**
 * Événements du tunnel de conversion, vers GTM (GA4) et le Pixel Meta.
 *
 * Chaque événement part sous deux noms : le nom GA4 e-commerce dans le
 * `dataLayer`, que le conteneur GTM relaie à GA4 quelle que soit sa
 * configuration, et le nom standard Meta vers `fbq`. Ni l'un ni l'autre ne
 * part sans consentement : le `dataLayer` n'est lu que si GTM a été chargé
 * (mesure), `fbq` n'existe que si le Pixel l'a été (marketing) — voir
 * app/plugins/tracking.client.ts.
 *
 * L'identifiant d'événement est partagé avec l'API Conversions (serveur) :
 * Meta dédoublonne le Pixel et le serveur sur ce couple nom + identifiant.
 */

/** Les six événements demandés par Big Five, nom Meta → nom GA4. */
const NOMS_GA4 = {
  PageView: 'page_view',
  ViewContent: 'view_item',
  CompleteRegistration: 'sign_up',
  InitiateCheckout: 'begin_checkout',
  AddPaymentInfo: 'add_payment_info',
  Purchase: 'purchase',
} as const

export type EvenementSuivi = keyof typeof NOMS_GA4

export interface ArticleSuivi {
  id: string
  titre: string
  prixFcfa: number | null
  /** Programme du module, ou « Coaching privé ». */
  categorie?: string
}

export interface DonneesSuivi {
  articles?: ArticleSuivi[]
  /** Montant total ; à défaut, la somme des articles. */
  valeur?: number
  /** Moyen de paiement (AddPaymentInfo). */
  moyen?: string
  /** Référence de commande (Purchase). */
  reference?: string
  /** `sign_up` : d'où vient l'inscription (tunnel d'achat ou page dédiée). */
  methode?: string
}

/** Ce que le navigateur joint aux appels serveur pour l'API Conversions. */
export interface ContexteSuivi {
  marketing: boolean
  fbp?: string
  fbc?: string
  url?: string
}

type Fenetre = Window & {
  dataLayer?: unknown[]
  fbq?: (...args: unknown[]) => void
}

/**
 * Événements émis avant que les traqueurs soient prêts. Une fiche module émet
 * ViewContent à son montage, alors que GTM et le Pixel ne se chargent qu'après
 * l'hydratation et la lecture des identifiants : sans cette file, la première
 * page vue — souvent celle où arrive la publicité — ne comptait jamais. Le
 * plugin la vide une fois les traqueurs posés (ou écartés, faute de
 * consentement), voir `libererSuivi`.
 */
let pret = false
const enAttente: Array<() => void> = []

/** Appelé par app/plugins/tracking.client.ts quand le sort des traqueurs est fixé. */
export function libererSuivi() {
  pret = true
  for (const envoi of enAttente.splice(0)) envoi()
}

function lireCookie(nom: string): string | undefined {
  const trouve = document.cookie.split('; ').find((c) => c.startsWith(`${nom}=`))
  return trouve ? decodeURIComponent(trouve.slice(nom.length + 1)) : undefined
}

export function useSuivi() {
  const { consentement, lire } = useConsentement()

  function choix() {
    return consentement.value ?? lire()
  }

  function suivre(evenement: EvenementSuivi, donnees: DonneesSuivi = {}, eventId?: string) {
    if (import.meta.server) return
    if (!pret) {
      enAttente.push(() => envoyer(evenement, donnees, eventId))
      return
    }
    envoyer(evenement, donnees, eventId)
  }

  function envoyer(evenement: EvenementSuivi, donnees: DonneesSuivi, eventId?: string) {
    const w = window as Fenetre
    const articles = donnees.articles ?? []
    const valeur = donnees.valeur ?? articles.reduce((somme, a) => somme + (a.prixFcfa ?? 0), 0)

    // GA4 : schéma e-commerce recommandé (`items`, `value`, `currency`).
    // `ecommerce: null` d'abord, comme le demande Google, pour qu'un événement
    // n'hérite pas des articles du précédent.
    if (choix()?.mesure && evenement !== 'PageView') {
      w.dataLayer = w.dataLayer ?? []
      w.dataLayer.push({ ecommerce: null })
      w.dataLayer.push({
        event: NOMS_GA4[evenement],
        event_id: eventId,
        ...(donnees.methode ? { method: donnees.methode } : {}),
        ecommerce: {
          currency: 'XOF',
          value: valeur,
          ...(donnees.reference ? { transaction_id: donnees.reference } : {}),
          ...(donnees.moyen ? { payment_type: donnees.moyen } : {}),
          items: articles.map((a) => ({
            item_id: a.id,
            item_name: a.titre,
            item_category: a.categorie,
            price: a.prixFcfa ?? 0,
            quantity: 1,
          })),
        },
      })
    }

    if (typeof w.fbq !== 'function' || !choix()?.marketing) return
    const parametres: Record<string, unknown> = {}
    if (articles.length) {
      parametres.content_ids = articles.map((a) => a.id)
      parametres.content_type = 'product'
      parametres.contents = articles.map((a) => ({ id: a.id, quantity: 1, item_price: a.prixFcfa ?? 0 }))
      if (articles.length === 1) parametres.content_name = articles[0]!.titre
    }
    if (evenement !== 'PageView') {
      parametres.value = valeur
      parametres.currency = 'XOF'
    }
    if (donnees.moyen) parametres.payment_method = donnees.moyen
    w.fbq('track', evenement, parametres, eventId ? { eventID: eventId } : undefined)
  }

  /** Consentement et cookies Meta, à joindre aux appels qui déclenchent un
   *  événement serveur (inscription, commande). Sans consentement marketing,
   *  rien d'autre que le refus ne part. */
  function contexteSuivi(): ContexteSuivi {
    if (import.meta.server || !choix()?.marketing) return { marketing: false }
    return {
      marketing: true,
      fbp: lireCookie('_fbp'),
      fbc: lireCookie('_fbc'),
      url: window.location.origin + window.location.pathname,
    }
  }

  return { suivre, contexteSuivi }
}
