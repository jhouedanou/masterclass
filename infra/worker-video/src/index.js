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
  mp4: 'video/mp4',
  vtt: 'text/vtt',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  json: 'application/json',
}

/** Préfixe des routes de dépôt. Le souligné est impossible dans une clé de
 *  chapitre (`^[a-z0-9][a-z0-9-]{2,80}$`) : aucune collision avec un chemin de
 *  lecture n'est donc possible. */
const PREFIXE_ECRITURE = '_televersement'

/** Parts de seize mégaoctets : le stockage impose au moins cinq mégaoctets et
 *  des parts de taille égale ; seize tient dans la mémoire d'un Worker tout en
 *  ramenant sept cents mégaoctets à quarante-quatre parts. */
const TAILLE_PART = 16 * 1024 * 1024

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

/**
 * Autorisation d'écriture — le pendant de `messageASigner` pour le dépôt d'une
 * vidéo.
 *
 * Trois séparations volontaires d'avec la lecture :
 *
 *   1. Le préfixe littéral « ecriture. » : un jeton de lecture ne peut jamais
 *      être rejoué en écriture, ni l'inverse. Sans lui, `cle.expiration.
 *      utilisateur` vaudrait pour les deux.
 *   2. L'action dans le message : un jeton émis pour pousser des parts ne
 *      permet pas de supprimer l'objet.
 *   3. Le paramètre `j` et non `s` : impossible de se tromper de vérificateur
 *      par inattention.
 *
 * Un jeton volé ne publie pourtant rien : l'objet ne se matérialise qu'à la
 * finalisation, que seule l'application déclenche après contrôle des droits.
 */
function messageEcriture(
  action,
  cle,
  uploadId,
  expiration,
  utilisateurId,
) {
  return `ecriture.${action}.${cle}.${uploadId}.${expiration}.${utilisateurId}`
}

async function verifierEcriture(
  action,
  cle,
  uploadId,
  parametres,
  secret,
  maintenant = Math.floor(Date.now() / 1000),
) {
  const expiration = Number(parametres.get('e'))
  const utilisateurId = parametres.get('u') ?? ''
  const signature = parametres.get('j') ?? ''

  if (!expiration || !utilisateurId || !signature) return 'autorisation absente'
  if (expiration < maintenant) return 'autorisation expirée'
  if (!cle) return 'chemin invalide'

  const attendue = await signer(
    messageEcriture(action, cle, uploadId, expiration, utilisateurId),
    secret,
  )

  if (signature.length !== attendue.length) return 'signature invalide'
  let ecart = 0
  for (let i = 0; i < attendue.length; i++) {
    ecart |= signature.charCodeAt(i) ^ attendue.charCodeAt(i)
  }
  return ecart === 0 ? null : 'signature invalide'
}

/**
 * En-têtes de partage entre origines.
 *
 * Le lecteur s'exécute sur le site, le Worker répond depuis un autre domaine :
 * sans ces en-têtes, le navigateur refuse la réponse avant même de la lire, et
 * la vidéo ne démarre pas. Un appel en ligne de commande, lui, ne s'en aperçoit
 * pas — seul un vrai navigateur applique cette règle.
 *
 * La liste est explicite plutôt qu'ouverte à tous : c'est sans incidence sur la
 * sécurité, l'autorisation voyageant dans l'URL et non dans un cookie, mais
 * cela évite qu'un site tiers n'intègre le lecteur avec un lien récupéré.
 */
function entetesCors(requete, env) {
  const origine = requete.headers.get('origin')
  const autorisees = (env.ORIGINES_AUTORISEES ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

  const entetes = { vary: 'Origin' }
  if (origine && autorisees.includes(origine)) {
    entetes['access-control-allow-origin'] = origine
    // Le PUT est celui des parts, seul verbe d'écriture qui parte du
    // navigateur : ouvrir, finaliser et supprimer restent l'affaire de
    // l'application, qui n'envoie pas d'origine.
    entetes['access-control-allow-methods'] = 'GET, HEAD, OPTIONS, PUT'
    entetes['access-control-allow-headers'] = 'Range, Content-Type'
    // Sans `ETag` exposé, le navigateur ne peut pas lire l'étiquette d'une
    // part : elle part bien, et la finalisation devient impossible sans que
    // rien ne le signale. L'étiquette voyage aussi dans le corps JSON, par
    // prudence.
    entetes['access-control-expose-headers'] =
      'Content-Range, Content-Length, Accept-Ranges, ETag'
    entetes['access-control-max-age'] = '86400'
  }
  return entetes
}

/** Réponse JSON commune aux routes de dépôt. */
function json(donnees, statut, cors) {
  return new Response(JSON.stringify(donnees), {
    status: statut,
    headers: { ...cors, 'content-type': 'application/json; charset=utf-8' },
  })
}

/**
 * Dépôt d'une vidéo, en plusieurs parts.
 *
 * Seul le PUT des parts part du navigateur ; ouvrir, finaliser, abandonner et
 * supprimer sont appelés par l'application, après contrôle des droits. C'est
 * ce qui rend l'écriture sûre sans rendre le jeton plus fin : un jeton volé
 * permet de pousser des octets dans un téléversement, mais l'objet ne se
 * matérialise qu'à la finalisation, hors de portée de son porteur.
 */
async function servirEcriture(requete, env, url, cors) {
  const [, action] = url.pathname.replace(/^\/+/, '').split('/')
  const parametres = url.searchParams
  const cle = parametres.get('c') ?? ''
  const uploadId = parametres.get('t') ?? ''

  // Le format de la clé est celui que la base contraint déjà : la redire ici
  // évite qu'un chemin tordu ne se glisse jusqu'au stockage.
  if (!/^[a-z0-9][a-z0-9-]{2,80}$/.test(cle)) {
    return json({ erreur: 'Clé invalide' }, 400, cors)
  }

  const refus = await verifierEcriture(action, cle, uploadId, parametres, env.VIDEO_SIGNING_SECRET)
  if (refus) return json({ erreur: `Écriture refusée — ${refus}` }, 403, cors)

  const objet = `${cle}/video.mp4`

  if (action === 'ouvrir' && requete.method === 'POST') {
    const depot = await env.VIDEOS.createMultipartUpload(objet, {
      httpMetadata: { contentType: 'video/mp4', cacheControl: 'private, max-age=31536000, immutable' },
    })
    return json({ uploadId: depot.uploadId, taillePart: TAILLE_PART }, 200, cors)
  }

  if (action === 'part' && requete.method === 'PUT') {
    const numero = Number(parametres.get('n'))
    if (!Number.isInteger(numero) || numero < 1 || numero > 10000) {
      return json({ erreur: 'Numéro de part hors bornes' }, 400, cors)
    }
    // Le corps est lu en entier plutôt qu'en flux : `uploadPart` se comporte
    // mal quand la longueur n'est pas connue, et seize mégaoctets tiennent
    // largement dans les cent vingt-huit d'un Worker.
    const octets = await requete.arrayBuffer()
    if (!octets.byteLength) return json({ erreur: 'Part vide' }, 400, cors)

    // Les quatre octets qui suivent la taille de la première boîte disent
    // « ftyp » sur un MP4. Ni l'extension ni le type déclaré ne prouvent quoi
    // que ce soit : le contrôle se fait ici, avant d'avoir consommé les
    // quarante-trois parts suivantes.
    if (numero === 1) {
      const entete = new Uint8Array(octets.slice(4, 8))
      const signature = String.fromCharCode(...entete)
      if (signature !== 'ftyp') {
        return json({ erreur: 'Ce fichier n’est pas un MP4' }, 415, cors)
      }
    }

    const depot = env.VIDEOS.resumeMultipartUpload(objet, uploadId)
    try {
      const part = await depot.uploadPart(numero, octets)
      // L'étiquette voyage dans le corps autant que dans l'en-tête : exposée
      // par CORS ou non, elle arrive.
      return json({ partNumber: part.partNumber, etag: part.etag }, 200, cors)
    } catch (erreur) {
      return json({ erreur: `Part refusée — ${erreur}` }, 502, cors)
    }
  }

  if (action === 'terminer' && requete.method === 'POST') {
    const { parts } = await requete.json()
    if (!Array.isArray(parts) || !parts.length) {
      return json({ erreur: 'Liste des parts manquante' }, 400, cors)
    }
    const depot = env.VIDEOS.resumeMultipartUpload(objet, uploadId)
    try {
      const fini = await depot.complete(
        parts.map((p) => ({ partNumber: Number(p.partNumber ?? p.n), etag: String(p.etag) })),
      )
      return json({ taille: fini.size, etag: fini.httpEtag }, 200, cors)
    } catch (erreur) {
      // Le message du stockage est peu parlant mais c'est le seul indice
      // quand une part n'a pas la bonne taille : on le remonte tel quel.
      return json({ erreur: `Finalisation refusée — ${erreur}` }, 502, cors)
    }
  }

  if (action === 'abandonner' && requete.method === 'POST') {
    try {
      await env.VIDEOS.resumeMultipartUpload(objet, uploadId).abort()
    } catch {
      // Un dépôt déjà abandonné lève : l'abandon doit rester rejouable, on
      // ferme l'onglet, on revient, on abandonne encore.
    }
    return new Response(null, { status: 204, headers: cors })
  }

  if (action === 'objet' && requete.method === 'DELETE') {
    // Le dossier peut contenir un flux HLS entier : on retire tout ce qui s'y
    // trouve, pas seulement le MP4.
    const liste = await env.VIDEOS.list({ prefix: `${cle}/` })
    await Promise.all(liste.objects.map((o) => env.VIDEOS.delete(o.key)))
    return json({ supprimes: liste.objects.length }, 200, cors)
  }

  return new Response('Route de dépôt inconnue', { status: 404, headers: cors })
}

/**
 * Normalisation de la plage servie. `objet.range` prend deux formes selon la
 * requête — un décalage et une longueur, ou un suffixe. Ignorer la seconde
 * casserait `Range: bytes=-1024`, que les lecteurs emploient pour lire la fin
 * d'un fichier.
 */
function plage(range, taille) {
  if (!range) return null
  if ('suffix' in range) {
    const longueur = Math.min(range.suffix, taille)
    return { debut: taille - longueur, longueur }
  }
  const debut = range.offset ?? 0
  const longueur = range.length ?? taille - debut
  return { debut, longueur }
}

export default {
  async fetch(requete, env) {
    const url = new URL(requete.url)
    const chemin = decodeURIComponent(url.pathname).replace(/^\/+/, '')
    const cors = entetesCors(requete, env)

    if (requete.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }
    if (!chemin || chemin.includes('..')) {
      return new Response('Chemin invalide', { status: 400, headers: cors })
    }

    // Le dépôt se route avant le garde-fou des méthodes de lecture : lui seul
    // accepte autre chose qu'un GET.
    if (chemin.startsWith(`${PREFIXE_ECRITURE}/`)) {
      return servirEcriture(requete, env, url, cors)
    }

    if (requete.method !== 'GET' && requete.method !== 'HEAD') {
      return new Response('Méthode non autorisée', { status: 405, headers: cors })
    }

    const refus = await verifierSignature(chemin, url.searchParams, env.VIDEO_SIGNING_SECRET)
    if (refus) {
      // Le motif aide au diagnostic sans rien révéler d'exploitable.
      return new Response(`Lecture refusée — ${refus}`, { status: 403, headers: cors })
    }

    // La plage et les requêtes conditionnelles sont remises telles quelles au
    // stockage : sans `Accept-Ranges`, Safari refuse purement et simplement de
    // lire un média, et se déplacer dans une vidéo devient impossible partout.
    const objet = await env.VIDEOS.get(chemin, {
      range: requete.headers,
      onlyIf: requete.headers,
    })
    if (!objet) return new Response('Fichier introuvable', { status: 404, headers: cors })

    const extension = chemin.slice(chemin.lastIndexOf('.') + 1)
    const entetes = new Headers(cors)
    objet.writeHttpMetadata(entetes)
    entetes.set('content-type', TYPES[extension] ?? 'application/octet-stream')
    entetes.set('etag', objet.httpEtag)
    entetes.set('accept-ranges', 'bytes')
    // Segments et fichiers uniques sont immuables — la clé d'un remplacement
    // est neuve —, les manifestes se rafraîchissent. « private » interdit à un
    // cache partagé de resservir un contenu autorisé pour un autre apprenant.
    entetes.set(
      'cache-control',
      extension === 'm3u8' ? 'private, max-age=60' : 'private, max-age=31536000, immutable',
    )
    // Conjugué à `controlslist`, rend l'enregistrement direct malcommode.
    entetes.set('content-disposition', 'inline')

    // Pas de corps : soit la plage demandée est hors du fichier, soit le
    // navigateur a déjà la bonne version. Les confondre renverrait un 416 là
    // où un 304 est attendu.
    if (!('body' in objet)) {
      if (requete.headers.get('range')) {
        entetes.set('content-range', `bytes */${objet.size}`)
        return new Response(null, { status: 416, headers: entetes })
      }
      return new Response(null, { status: 304, headers: entetes })
    }

    if (extension === 'm3u8') {
      const texte = reecrirePlaylist(await objet.text(), url.searchParams.toString())
      entetes.delete('content-length')
      return new Response(requete.method === 'HEAD' ? null : texte, { headers: entetes })
    }

    const portion = plage(objet.range, objet.size)
    if (portion) {
      const fin = portion.debut + portion.longueur - 1
      entetes.set('content-range', `bytes ${portion.debut}-${fin}/${objet.size}`)
      // `writeHttpMetadata` n'écrit pas la longueur : sans elle, le lecteur ne
      // sait pas quand la portion s'arrête.
      entetes.set('content-length', String(portion.longueur))
      return new Response(requete.method === 'HEAD' ? null : objet.body, {
        status: 206,
        headers: entetes,
      })
    }

    entetes.set('content-length', String(objet.size))
    return new Response(requete.method === 'HEAD' ? null : objet.body, { headers: entetes })
  },
}
