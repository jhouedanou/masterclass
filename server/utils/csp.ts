import { createHash } from 'node:crypto'
import { baseVideo } from './video'

/**
 * Politique de sécurité du contenu à hôtes nommés, en observation.
 *
 * La politique appliquée au site (CSP_SITE, nuxt.config.ts) admet `https:`
 * comme source de scripts, de connexions et de cadres. Celle-ci nomme les
 * hôtes, et remplace `'unsafe-inline'` par un nonce tiré à chaque page (voir
 * server/plugins/csp.ts). Elle part en `Content-Security-Policy-Report-Only` :
 * le navigateur ne bloque rien, il signale à /api/csp-rapport ce qu'elle
 * aurait refusé. Quand les rapports ne montrent plus que du bruit, elle prend
 * la place de CSP_SITE (docs/csp-mode-d-emploi.md).
 *
 * Les hôtes de départ viennent des SDK eux-mêmes : les adresses que citent
 * @zoom/meetingsdk 6.2.0 et le SDK FeexPay, et les hôtes habituels de GTM et
 * des pixels de l'écran 19. Les pages d'Orange, de Wave ou de la banque ne
 * sont pas dans la liste : le SDK FeexPay y envoie la page entière
 * (`location.href`), ce qu'une CSP ne régit pas, ou les ouvre dans un cadre
 * dont il reçoit l'adresse — les rapports diront lesquelles.
 */

export const POINT_DE_COLLECTE = '/api/csp-rapport'

/** Nom du point de collecte pour `report-to`, déclaré par `Reporting-Endpoints`. */
export const GROUPE_DE_COLLECTE = 'csp-rapport'

// Meeting SDK : scripts, styles et WebAssembly de source.zoom.us et des deux
// CloudFront de Zoom, signalisation en wss sur les serveurs de la réunion.
const ZOOM = [
  'https://zoom.us',
  'https://*.zoom.us',
  'https://dmogdx0jrul3u.cloudfront.net',
  'https://d1cdksi819e9z7.cloudfront.net',
]

// SDK de paiement et API (api-v2), logo servi par feexpay.me.
const FEEXPAY = ['https://feexpay.me', 'https://*.feexpay.me']

// Le SDK FeexPay importe ses polices dans une feuille qu'il injecte, et
// demande l'adresse IP du payeur à ipify avant d'ouvrir le paiement.
const FEEXPAY_STYLES = ['https://fonts.googleapis.com', 'https://fonts.cdnfonts.com']
const FEEXPAY_POLICES = ['https://fonts.gstatic.com', 'https://fonts.cdnfonts.com']
const FEEXPAY_CONNEXIONS = ['https://api.ipify.org']

// GTM, GA4 et Google Ads. Chaque domaine Google se nomme à part : la syntaxe
// n'admet pas de joker à droite du nom (google.ci, google.fr…).
const GOOGLE_SCRIPTS = [
  'https://www.googletagmanager.com',
  'https://www.google-analytics.com',
  'https://www.googleadservices.com',
  'https://googleads.g.doubleclick.net',
  'https://www.google.com',
]
const GOOGLE_CONNEXIONS = [
  'https://www.googletagmanager.com',
  'https://*.google-analytics.com',
  'https://*.analytics.google.com',
  'https://*.g.doubleclick.net',
  'https://www.google.com',
]

// Pixels Meta, TikTok et LinkedIn, que le conteneur GTM charge.
const PIXELS_SCRIPTS = ['https://connect.facebook.net', 'https://analytics.tiktok.com', 'https://snap.licdn.com']
const PIXELS_CONNEXIONS = ['https://www.facebook.com', 'https://analytics.tiktok.com', 'https://px.ads.linkedin.com']

function hacher(code: string): string {
  return `'sha256-${createHash('sha256').update(code).digest('base64')}'`
}

// <NuxtImg> rendu côté serveur porte ce gestionnaire en ligne (@nuxt/image 2).
// Seul gestionnaire d'attribut du site : on l'admet par son empreinte plutôt
// que d'ouvrir les attributs `on…` à tous.
const GESTIONNAIRES_ADMIS = ["'unsafe-hashes'", hacher("this.setAttribute('data-error', 1)")]

/** Origine du Worker vidéo ; rien en développement, où `/medias` est sur le site. */
function origineVideo(): string[] {
  try {
    return [new URL(baseVideo()).origin]
  } catch {
    return []
  }
}

export function politiqueObservation(nonce: string): string {
  const video = origineVideo()
  const directive = (nom: string, ...sources: string[]) => [nom, ...sources].join(' ')

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    directive(
      'script-src',
      "'self'",
      `'nonce-${nonce}'`,
      ...GESTIONNAIRES_ADMIS,
      // Le Meeting SDK évalue du code et compile du WebAssembly ; les variables
      // JavaScript personnalisées de GTM évaluent aussi.
      "'unsafe-eval'",
      "'wasm-unsafe-eval'",
      'blob:',
      ...ZOOM,
      ...FEEXPAY,
      ...GOOGLE_SCRIPTS,
      ...PIXELS_SCRIPTS,
      // Les 40 premiers caractères du script refusé : de quoi savoir qui l'a
      // écrit. La route de collecte les expurge.
      "'report-sample'",
    ),
    directive('style-src', "'self'", "'unsafe-inline'", ...ZOOM, ...FEEXPAY_STYLES),
    // Les images restent ouvertes : pixels de mesure, visuels des articles,
    // avatars Zoom. Une image ne s'exécute pas.
    "img-src 'self' data: blob: https:",
    directive('font-src', "'self'", 'data:', ...ZOOM, ...FEEXPAY_POLICES),
    directive('media-src', "'self'", 'blob:', ...video, ...ZOOM),
    directive(
      'connect-src',
      "'self'",
      ...video,
      ...ZOOM,
      'wss://*.zoom.us',
      ...FEEXPAY,
      ...FEEXPAY_CONNEXIONS,
      ...GOOGLE_CONNEXIONS,
      ...PIXELS_CONNEXIONS,
      ...(import.meta.dev ? ['ws:'] : []),
    ),
    "worker-src 'self' blob:",
    // GTM ouvre son mode Aperçu dans un cadre.
    directive('frame-src', "'self'", ...FEEXPAY, ...ZOOM, 'https://www.googletagmanager.com'),
    "manifest-src 'self'",
    // `report-to` pour les navigateurs qui le connaissent (Chrome, Edge), qui
    // ignorent alors `report-uri` ; `report-uri` pour Firefox et Safari.
    `report-uri ${POINT_DE_COLLECTE}`,
    `report-to ${GROUPE_DE_COLLECTE}`,
  ].join('; ')
}
