/**
 * Diffusion des vidéos E-Masterclass — Cloudflare Worker devant un bucket R2.
 *
 * Rôle : vérifier l'autorisation signée par l'application, puis servir le
 * fichier depuis le stockage. Le Worker ne connaît ni les comptes ni la base :
 * il ne sait que recalculer une signature. C'est ce qui permet de diffuser
 * sans qu'un seul segment vidéo ne traverse le serveur applicatif.
 *
 * Le tarif suit : la sortie de données de R2 est gratuite, et le plan gratuit
 * du Worker couvre largement le trafic d'une plateforme de cette taille.
 *
 * ⚠ La vérification ci-dessous doit rester identique à celle de
 * `server/utils/video.ts`. `npm run video:verifier` compare les deux et échoue
 * si elles divergent.
 */

const TYPES = {
  m3u8: 'application/vnd.apple.mpegurl',
  ts: 'video/mp2t',
  jpg: 'image/jpeg',
  json: 'application/json',
}

function messageASigner(cle, expiration, utilisateurId) {
  return `${cle}.${expiration}.${utilisateurId}`
}

function encoderBase64Url(octets) {
  let binaire = ''
  for (const octet of new Uint8Array(octets)) binaire += String.fromCharCode(octet)
  return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function signer(message, secret) {
  const cleHmac = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return encoderBase64Url(
    await crypto.subtle.sign('HMAC', cleHmac, new TextEncoder().encode(message)),
  )
}

async function verifierSignature(chemin, parametres, secret, maintenant = Math.floor(Date.now() / 1000)) {
  const expiration = Number(parametres.get('e'))
  const utilisateurId = parametres.get('u') ?? ''
  const signature = parametres.get('s') ?? ''

  if (!expiration || !utilisateurId || !signature) return 'autorisation absente'
  if (expiration < maintenant) return 'autorisation expirée'

  const cle = chemin.replace(/^\/+/, '').split('/')[0] ?? ''
  if (!cle) return 'chemin invalide'

  const attendue = await signer(messageASigner(cle, expiration, utilisateurId), secret)

  if (signature.length !== attendue.length) return 'signature invalide'
  let ecart = 0
  for (let i = 0; i < attendue.length; i++) {
    ecart |= signature.charCodeAt(i) ^ attendue.charCodeAt(i)
  }
  return ecart === 0 ? null : 'signature invalide'
}

/**
 * Réécriture d'un manifeste HLS : l'autorisation reçue est reportée sur chaque
 * URL qu'il référence.
 *
 * Sans cela, seul le manifeste serait autorisé : le lecteur demanderait
 * ensuite ses variantes et ses segments sans jeton, et se ferait refuser. On
 * pourrait rattacher le jeton côté navigateur, mais Safari sur iPhone lit le
 * HLS nativement et ne laisse pas intercepter ses requêtes. Le faire ici règle
 * le cas de tous les lecteurs d'un coup.
 */
function reecrirePlaylist(texte, requete) {
  return texte
    .split('\n')
    .map((ligne) => {
      const nette = ligne.trim()
      if (!nette) return ligne
      // URI portée par un attribut : pistes audio, clés de chiffrement.
      if (nette.startsWith('#')) {
        return ligne.replace(/URI="([^"]+)"/g, (_, cible) => `URI="${cible}?${requete}"`)
      }
      // Ligne d'URI simple : variante ou segment.
      return `${nette}?${requete}`
    })
    .join('\n')
}

export default {
  async fetch(requete, env) {
    const url = new URL(requete.url)
    const chemin = decodeURIComponent(url.pathname).replace(/^\/+/, '')

    if (requete.method !== 'GET' && requete.method !== 'HEAD') {
      return new Response('Méthode non autorisée', { status: 405 })
    }
    if (!chemin || chemin.includes('..')) {
      return new Response('Chemin invalide', { status: 400 })
    }

    const refus = await verifierSignature(chemin, url.searchParams, env.VIDEO_SIGNING_SECRET)
    if (refus) {
      // Le motif aide au diagnostic sans rien révéler d'exploitable.
      return new Response(`Lecture refusée — ${refus}`, { status: 403 })
    }

    const objet = await env.VIDEOS.get(chemin)
    if (!objet) return new Response('Fichier introuvable', { status: 404 })

    const extension = chemin.slice(chemin.lastIndexOf('.') + 1)
    const entetes = new Headers()
    objet.writeHttpMetadata(entetes)
    entetes.set('content-type', TYPES[extension] ?? 'application/octet-stream')
    entetes.set('etag', objet.httpEtag)
    // Segments immuables, manifestes rafraîchis : « private » interdit à un
    // cache partagé de resservir un contenu autorisé pour un autre apprenant.
    entetes.set(
      'cache-control',
      extension === 'ts' ? 'private, max-age=31536000, immutable' : 'private, max-age=60',
    )

    if (extension === 'm3u8') {
      const texte = reecrirePlaylist(await objet.text(), url.searchParams.toString())
      entetes.delete('content-length')
      return new Response(requete.method === 'HEAD' ? null : texte, { headers: entetes })
    }

    return new Response(requete.method === 'HEAD' ? null : objet.body, { headers: entetes })
  },
}
