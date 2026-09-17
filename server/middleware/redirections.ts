import { listerRedirections } from '../database/administration'

/**
 * Applique les redirections permanentes créées lors des changements de slug.
 *
 * Ce middleware lisait `server/data/db.ts`, où `redirections` est un tableau
 * vide : ce fichier est la source du *seed*, pas l'état courant. L'admin
 * affichait donc une redirection créée, et l'ancienne URL rendait un 404.
 *
 * La table est lue en base, puis gardée en mémoire : le middleware s'exécute à
 * chaque requête et ne peut pas interroger Supabase à chaque fois. Les
 * changements de slug sont rares, une minute de retard est sans conséquence.
 */
const DUREE_CACHE_MS = 60_000

let cache: Map<string, string> | null = null
let expiration = 0
let chargement: Promise<Map<string, string>> | null = null

async function reglesCourantes(): Promise<Map<string, string>> {
  if (cache && Date.now() < expiration) return cache
  // Une seule lecture même si plusieurs requêtes arrivent sur un cache expiré.
  chargement ??= listerRedirections()
    .then((lignes) => {
      cache = new Map(lignes.map((r) => [r.de, r.vers]))
      expiration = Date.now() + DUREE_CACHE_MS
      return cache
    })
    .finally(() => {
      chargement = null
    })
  try {
    return await chargement
  } catch {
    // Base injoignable : mieux vaut servir la page que renvoyer une erreur.
    return cache ?? new Map()
  }
}

export default defineEventHandler(async (event) => {
  const chemin = event.path.split('?')[0]!

  // Ni les API, ni les fichiers du build, ni les ressources statiques : seules
  // les URL de pages ont pu changer de slug.
  if (chemin.startsWith('/api/') || chemin.startsWith('/_') || chemin.includes('.')) return

  const vers = (await reglesCourantes()).get(chemin)
  if (vers && vers !== chemin) {
    return sendRedirect(event, vers, 301)
  }
})
