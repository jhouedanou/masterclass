import type { H3Event } from 'h3'

/**
 * Adresse de l'appelant, pour les comptages qui doivent distinguer un visiteur
 * d'un autre.
 *
 * Deux pièges que `getRequestIP` seul ne couvre pas :
 *
 * - `x-forwarded-for` est renseigné par le client autant que par le proxy. S'y
 *   fier seul rendrait tout comptage contournable en forgeant l'en-tête. Sur
 *   Vercel, `x-vercel-forwarded-for` est posé par la plateforme et n'est pas
 *   écrasable : il prime.
 * - au rendu serveur, `useFetch` appelle Nitro sans passer par le réseau : il
 *   n'y a ni socket ni en-tête, d'où le repli explicite. La page doit
 *   retransmettre les en-têtes utiles (`useRequestHeaders`) pour que le
 *   comptage porte sur le visiteur et non sur le serveur lui-même.
 */
export function adresseAppelant(event: H3Event): string {
  const vercel = getRequestHeader(event, 'x-vercel-forwarded-for')
  if (vercel) return vercel.split(',')[0]!.trim()
  return getRequestIP(event, { xForwardedFor: true }) ?? 'inconnue'
}
