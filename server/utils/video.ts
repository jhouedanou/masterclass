/**
 * Accès aux vidéos : signature des URL de lecture.
 *
 * Le principe tient en une phrase : le serveur ne sert jamais la vidéo, il
 * remet à l'apprenant une autorisation à durée limitée que le CDN vérifie
 * ensuite tout seul. Personne ne peut donc partager un lien durablement, et
 * la diffusion ne coûte pas un aller-retour applicatif par segment.
 *
 * La signature couvre le *préfixe* — le dossier d'un chapitre — et non chaque
 * fichier : un flux HLS se compose d'un manifeste, de sous-manifestes et de
 * centaines de segments, tous sous ce même dossier. Le lecteur rattache la
 * même autorisation à toutes ses requêtes (voir le chargeur de la page de
 * lecture), et le vérificateur contrôle que le chemin demandé reste bien dans
 * le dossier autorisé.
 *
 * ⚠ `verifierSignature` existe en double dans `infra/worker-video/src/index.js`,
 * qui tourne sur Cloudflare et ne peut pas importer ce fichier. Toute
 * modification ici doit y être reportée — `npm run video:verifier` compare les
 * deux implémentations et échoue si elles divergent.
 */

/** Durée de validité d'une autorisation de lecture. Assez longue pour un
 *  chapitre entier, assez courte pour qu'un lien copié devienne vite inerte. */
export const DUREE_AUTORISATION_SECONDES = 60 * 60 * 4

function encoderBase64Url(octets: ArrayBuffer): string {
  return Buffer.from(octets).toString('base64url')
}

/** Message signé : le dossier, l'échéance et le destinataire.
 *  Y inclure l'apprenant rend l'autorisation nominative — un lien copié reste
 *  attribuable à celui qui l'a obtenu. */
export function messageASigner(cle: string, expiration: number, utilisateurId: string): string {
  return `${cle}.${expiration}.${utilisateurId}`
}

export async function signer(message: string, secret: string): Promise<string> {
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

/**
 * Secret partagé entre l'application et le CDN. Sans lui, aucune vidéo n'est
 * lisible : mieux vaut un refus franc qu'une diffusion ouverte à tous.
 */
export function secretVideo(): string {
  const config = useRuntimeConfig()
  const secret = process.env.VIDEO_SIGNING_SECRET || config.videoSigningSecret || ''

  if (secret.length >= 32) return secret

  if (process.env.NODE_ENV === 'production') {
    throw createError({
      statusCode: 500,
      statusMessage:
        'VIDEO_SIGNING_SECRET manquant ou trop court (32 caractères minimum) : les vidéos ne peuvent pas être autorisées.',
    })
  }

  // Repli de développement uniquement, sans valeur de sécurité. Il vaut aussi
  // pour la route locale de service : les deux côtés le partagent.
  return 'developpement-uniquement-video-e-masterclass-big-five'
}

/** Base publique des vidéos : le Worker Cloudflare en production, la route
 *  locale `/medias` en développement — même contrat de signature. */
export function baseVideo(): string {
  const config = useRuntimeConfig()
  return (process.env.VIDEO_BASE_URL || config.videoBaseUrl || '/medias').replace(/\/+$/, '')
}

/** URL du manifeste HLS d'un chapitre, autorisée pour cet apprenant. */
export async function urlLectureSignee(cle: string, utilisateurId: string): Promise<string> {
  const expiration = Math.floor(Date.now() / 1000) + DUREE_AUTORISATION_SECONDES
  const signature = await signer(messageASigner(cle, expiration, utilisateurId), secretVideo())
  const parametres = new URLSearchParams({
    e: String(expiration),
    u: utilisateurId,
    s: signature,
  })
  return `${baseVideo()}/${cle}/master.m3u8?${parametres}`
}

/**
 * Contrôle d'une requête de lecture, côté serveur local. Le Worker applique
 * exactement la même règle en production.
 *
 * Renvoie `null` si tout est en ordre, sinon le motif du refus.
 */
export async function verifierSignature(
  chemin: string,
  parametres: URLSearchParams,
  secret: string,
  maintenant = Math.floor(Date.now() / 1000),
): Promise<string | null> {
  const expiration = Number(parametres.get('e'))
  const utilisateurId = parametres.get('u') ?? ''
  const signature = parametres.get('s') ?? ''

  if (!expiration || !utilisateurId || !signature) return 'autorisation absente'
  if (expiration < maintenant) return 'autorisation expirée'

  // Le premier segment du chemin est le dossier du chapitre : c'est lui qui a
  // été signé. Tout ce qu'il contient est alors accessible, et rien d'autre.
  const cle = chemin.replace(/^\/+/, '').split('/')[0] ?? ''
  if (!cle) return 'chemin invalide'

  const attendue = await signer(messageASigner(cle, expiration, utilisateurId), secret)

  // Comparaison à durée constante : une comparaison naïve laisserait deviner
  // la signature octet par octet.
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
export function reecrirePlaylist(texte: string, requete: string): string {
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
