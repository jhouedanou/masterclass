import type { H3Event } from 'h3'

/**
 * Écritures de l'API : même site, et du JSON.
 *
 * Le cookie de session est `SameSite=Lax` : il ne part pas avec une requête
 * d'écriture venue d'un autre site. Mais les routes qui ouvrent une session —
 * connexion, inscription, réinitialisation — n'en ont pas besoin : un site
 * tiers pouvait y poster un formulaire et connecter le navigateur de sa
 * victime à un compte qu'il contrôle (CSRF de connexion), pour recueillir
 * ensuite ce qu'elle y saisit. Et `Lax` ne protège pas d'un sous-domaine
 * frère, ni des navigateurs qui l'appliquent mal.
 *
 * Deux contrôles, sur POST, PUT, PATCH et DELETE de `/api/` :
 *
 * - l'origine (`Origin`, sinon `Referer`) doit être ce site. Sans ni l'un ni
 *   l'autre, ce n'est pas un navigateur — un script, le rendu serveur — et il
 *   n'y a pas de CSRF possible ; un navigateur qui dit `Sec-Fetch-Site:
 *   cross-site` est refusé quand même ;
 * - le corps est du JSON, qu'un formulaire HTML ne sait pas envoyer et qu'un
 *   `fetch` d'un autre site ne peut envoyer qu'après une requête préalable
 *   que nous ne validons pas. Les dépôts de fichiers, en `multipart`, sont
 *   admis sur leurs seules routes. Une requête sans corps passe. Les rapports
 *   CSP, que le navigateur envoie lui-même dans ses propres types, sont admis
 *   sur la route de collecte : elle n'écrit que dans les journaux.
 *
 * Les appels de machine à machine — tâches planifiées, webhook FeexPay — n'ont
 * ni navigateur ni cookie : ils s'authentifient par une clé, et en sont exemptés.
 */
const METHODES = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

const MACHINE_A_MACHINE = [/^\/api\/taches\//, /^\/api\/paiements\/feexpay\/webhook$/]

const DEPOTS = [
  /^\/api\/admin\/attestation\/signature$/,
  /^\/api\/admin\/module\/[^/]+\/couverture$/,
  /^\/api\/admin\/video\/script$/,
  /^\/api\/formateur\/photo$/,
  /^\/api\/mon-espace\/compte\/photo$/,
]

const COLLECTE_CSP = /^\/api\/csp-rapport$/
const TYPES_RAPPORT = new Set(['application/csp-report', 'application/reports+json'])

function hote(adresse: string): string | null {
  try {
    return new URL(adresse).host
  } catch {
    return null
  }
}

function memeSite(event: H3Event, provenance: string): boolean {
  const sien = hote(provenance)
  if (!sien) return false
  return (
    sien === getRequestHost(event, { xForwardedHost: true }) ||
    sien === hote(useRuntimeConfig().public.siteUrl)
  )
}

export default defineEventHandler((event) => {
  if (!METHODES.has(event.method)) return
  const chemin = event.path.split('?')[0] ?? ''
  if (!chemin.startsWith('/api/')) return
  if (MACHINE_A_MACHINE.some((motif) => motif.test(chemin))) return

  const provenance = getRequestHeader(event, 'origin') ?? getRequestHeader(event, 'referer')
  const refus = provenance
    ? !memeSite(event, provenance)
    : getRequestHeader(event, 'sec-fetch-site') === 'cross-site'
  if (refus) {
    throw createError({ statusCode: 403, statusMessage: 'Requête refusée : elle ne vient pas de ce site.' })
  }

  const type = (getRequestHeader(event, 'content-type') ?? '').split(';')[0]!.trim().toLowerCase()
  if (!type || type === 'application/json') return
  if (type === 'multipart/form-data' && DEPOTS.some((motif) => motif.test(chemin))) return
  if (TYPES_RAPPORT.has(type) && COLLECTE_CSP.test(chemin)) return

  throw createError({ statusCode: 415, statusMessage: 'Format de requête non accepté : JSON attendu.' })
})
