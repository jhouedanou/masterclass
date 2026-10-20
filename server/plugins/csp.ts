import { randomBytes } from 'node:crypto'
import { GROUPE_DE_COLLECTE, POINT_DE_COLLECTE, politiqueObservation } from '../utils/csp'

/**
 * Nonce des scripts et politique en observation, page par page.
 *
 * Nuxt n'écrit pas de nonce lui-même (il ne fait que le reprendre en rendu en
 * flux, que le site n'utilise pas). On le pose ici sur les balises `<script>`
 * et `<link>` de `<head>` et de la fin de `<body>`, que seul unhead écrit : le
 * module d'entrée, la configuration en ligne (`window.__NUXT__`), la charge
 * utile JSON, la table d'import, les scripts de `useHead` (SDK FeexPay), les
 * préchargements. Le rendu de l'application n'est pas touché : il porte le
 * contenu éditorial rendu par `v-html`, et un `<script>` qui s'y glisserait
 * recevrait le nonce au lieu d'être refusé. Du corps, seuls les morceaux que
 * les modules y ajoutent tout entiers en reçoivent un : nuxt-site-config y
 * écrit `window.__NUXT_SITE_CONFIG__`. Ses crochets passent avant celui-ci,
 * les plugins des modules étant chargés avant ceux du projet.
 *
 * Seules les pages passent par ces deux crochets : les réponses de `/api/` ne
 * reçoivent ni nonce ni politique en observation. Le back-office garde la
 * sienne (CSP_ADMIN). Les pages ne sont jamais mises en cache (voir
 * `routeRules`) : un nonce servi deux fois ne vaudrait plus rien.
 */
const BALISES = /<(script|link)(?=[\s>])/g
const BACK_OFFICE = /^\/admin(?:[/?]|$)/

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('render:html', (html, { event }) => {
    if (BACK_OFFICE.test(event.path)) return
    const nonce = randomBytes(16).toString('base64')
    event.context.cspNonce = nonce
    const marquer = (fragment: string) => fragment.replace(BALISES, `<$1 nonce="${nonce}"`)
    html.head = html.head.map(marquer)
    html.body = html.body.map((fragment) => (fragment.startsWith('<script') ? marquer(fragment) : fragment))
    html.bodyAppend = html.bodyAppend.map(marquer)
  })

  nitro.hooks.hook('render:response', (reponse, { event }) => {
    const nonce = event.context.cspNonce as string | undefined
    if (!nonce || !reponse.headers) return
    reponse.headers['content-security-policy-report-only'] = politiqueObservation(nonce)
    reponse.headers['reporting-endpoints'] = `${GROUPE_DE_COLLECTE}="${POINT_DE_COLLECTE}"`
  })
})
