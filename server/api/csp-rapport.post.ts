import { limiterDebit } from '../utils/debit'

/**
 * Collecte des rapports de la politique en observation (server/utils/csp.ts).
 *
 * Deux formats arrivent ici :
 *
 * - `report-uri` : un objet `{ "csp-report": {…} }` par violation, en
 *   `application/csp-report` (Firefox, Chromium sans API Reporting) ou
 *   `application/json` (Safari) ;
 * - `report-to` : un tableau de rapports `{ type: "csp-violation", body }`, en
 *   `application/reports+json`, que Chrome regroupe et envoie en différé.
 *
 * Rien de personnel n'est gardé : ni l'adresse IP, ni le navigateur, ni la
 * page de provenance, ni la politique entière. L'adresse de la page est
 * réduite à son chemin, sans requête, et ses segments variables sont masqués
 * (jeton, numéro d'attestation, slug daté) ; la ressource refusée est réduite
 * à son origine, le script fautif à son chemin masqué ; l'extrait de script,
 * que le navigateur coupe déjà à 40 caractères, est expurgé des adresses
 * e-mail et des suites de chiffres.
 *
 * Chaque violation devient une ligne `[csp] {…}` dans les journaux Vercel. Les
 * rapports des extensions du navigateur, qui ne disent rien du site, sont
 * écartés.
 */
const TAILLE_MAX = 64 * 1024
const VIOLATIONS_MAX = 20
const EXTENSION = /^(chrome|moz|safari|safari-web|ms-browser)-extension:/

type Brut = Record<string, unknown>

function texte(valeur: unknown, max: number): string | undefined {
  return typeof valeur === 'string' && valeur ? valeur.slice(0, max) : undefined
}

function nombre(valeur: unknown): number | undefined {
  return typeof valeur === 'number' && Number.isFinite(valeur) ? valeur : undefined
}

/** `https://hote/chemin?q` → `https://hote` ; `inline`, `eval`, `data:…` → `inline`, `eval`, `data`. */
function origine(adresse: string | undefined): string | undefined {
  if (!adresse) return undefined
  try {
    const url = new URL(adresse)
    return /^(https?|wss?):$/.test(url.protocol) ? url.origin : url.protocol.slice(0, -1)
  } catch {
    return adresse.slice(0, 40)
  }
}

// Un segment de chemin n'est gardé que s'il ne peut pas porter d'identifiant :
// ni chiffre, ni majuscule pour une page (les jetons, les numéros
// d'attestation en ont). Un nom de fichier garde ses majuscules et son point.
const SEGMENT_PAGE = /^[a-z-]{1,40}$/
const SEGMENT_FICHIER = /^[a-zA-Z_.-]{1,60}$/

function masquer(pathname: string, segmentSur: RegExp): string {
  return pathname
    .split('/')
    .map((segment) => (segment === '' || segmentSur.test(segment) ? segment : '*'))
    .join('/')
}

/** Chemin de la page, segments variables masqués : `/verifier/EMC-2026-…` → `/verifier/*`. */
function chemin(adresse: string | undefined): string | undefined {
  if (!adresse) return undefined
  try {
    return masquer(new URL(adresse).pathname, SEGMENT_PAGE)
  } catch {
    return undefined
  }
}

/** Script fautif : son origine et son chemin masqué, sans la requête. Pour un
 *  script en ligne, c'est l'adresse de la page elle-même. */
function fichier(adresse: string | undefined): string | undefined {
  if (!adresse) return undefined
  try {
    const url = new URL(adresse)
    return /^https?:$/.test(url.protocol)
      ? `${url.origin}${masquer(url.pathname, SEGMENT_FICHIER)}`.slice(0, 160)
      : origine(adresse)
  } catch {
    return origine(adresse)
  }
}

/** Le navigateur coupe l'extrait à 40 caractères, parfois au milieu d'un
 *  numéro : toute suite de quatre chiffres ou plus est masquée. */
function extrait(valeur: unknown): string | undefined {
  return texte(valeur, 40)
    ?.replace(/[^\s@'"]+@[^\s@'"]*/g, '…@…')
    .replace(/\d{4,}/g, '…')
}

/** Les violations d'un envoi, quel qu'en soit le format. */
function violations(corps: unknown): Brut[] {
  if (Array.isArray(corps)) {
    return corps
      .filter((rapport): rapport is { body: Brut } =>
        rapport?.type === 'csp-violation' && !!rapport.body && typeof rapport.body === 'object',
      )
      .map((rapport) => rapport.body)
  }
  if (corps && typeof corps === 'object' && 'csp-report' in corps) {
    const rapport = (corps as Brut)['csp-report']
    return rapport && typeof rapport === 'object' ? [rapport as Brut] : []
  }
  return []
}

function normaliser(brut: Brut) {
  const lire = (...cles: string[]) => cles.map((cle) => brut[cle]).find((v) => v !== undefined && v !== '')

  const bloque = texte(lire('blockedURL', 'blocked-uri'), 2000)
  const source = texte(lire('sourceFile', 'source-file'), 2000)
  if (EXTENSION.test(bloque ?? '') || EXTENSION.test(source ?? '')) return null

  return {
    directive: texte(lire('effectiveDirective', 'effective-directive', 'violated-directive'), 80)?.split(' ')[0],
    bloque: origine(bloque),
    page: chemin(texte(lire('documentURL', 'document-uri'), 2000)),
    source: fichier(source),
    ligne: nombre(lire('lineNumber', 'line-number')),
    colonne: nombre(lire('columnNumber', 'column-number')),
    extrait: extrait(lire('sample', 'script-sample')),
    mode: lire('disposition') === 'enforce' ? 'bloquant' : 'observation',
  }
}

export default defineEventHandler(async (event) => {
  if (Number(getRequestHeader(event, 'content-length') ?? 0) > TAILLE_MAX) {
    throw createError({ statusCode: 413, statusMessage: 'Rapport trop volumineux.' })
  }
  await limiterDebit(event, 'csp-rapport')

  const brut = await readRawBody(event, 'utf8')
  let corps: unknown = null
  if (brut && brut.length <= TAILLE_MAX) {
    try {
      corps = JSON.parse(brut)
    } catch {
      // Un rapport illisible ne mérite pas d'erreur : le navigateur n'en fait rien.
    }
  }

  for (const violation of violations(corps).slice(0, VIOLATIONS_MAX)) {
    const ligne = normaliser(violation)
    if (ligne) console.warn(`[csp] ${JSON.stringify(ligne)}`)
  }

  setResponseStatus(event, 204)
  return null
})
