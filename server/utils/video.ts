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

import { dureeMp4, OCTETS_ENTETE_MP4 } from '#shared/utils/dureeMp4'

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

/** Nom du fichier à demander au diffuseur selon la forme de la vidéo. Le
 *  dossier, lui, ne change pas : c'est lui que porte la signature. */
export const FICHIER_VIDEO = { hls: 'master.m3u8', fichier: 'video.mp4' } as const

/** Formats de dépôt acceptés. Une seule liste, lue par le contrôle du
 *  navigateur, celui du serveur et celui du diffuseur — l'élargir un jour ne
 *  demandera qu'une ligne. */
export const FORMATS_VIDEO_ACCEPTES = ['mp4'] as const

/**
 * URL de lecture d'un chapitre, autorisée pour cet apprenant.
 *
 * Le dernier segment dépend de la forme de la vidéo, jamais la signature : le
 * message signé reste le dossier, l'échéance et le destinataire, exactement
 * comme avant l'arrivée du dépôt depuis l'administration.
 */
export async function urlLectureSignee(
  cle: string,
  utilisateurId: string,
  format: 'hls' | 'fichier' = 'hls',
): Promise<string> {
  const expiration = Math.floor(Date.now() / 1000) + DUREE_AUTORISATION_SECONDES
  const signature = await signer(messageASigner(cle, expiration, utilisateurId), secretVideo())
  const parametres = new URLSearchParams({
    e: String(expiration),
    u: utilisateurId,
    s: signature,
  })
  return `${baseVideo()}/${cle}/${FICHIER_VIDEO[format]}?${parametres}`
}

/**
 * Durée réelle d'une vidéo déposée, lue dans l'objet plutôt que rapportée.
 *
 * Le navigateur annonce une durée à l'ouverture du dépôt — il faut bien en
 * avoir une avant que le fichier n'existe. Une fois l'objet en place, le
 * fichier peut répondre lui-même : une plage d'un mégaoctet suffit à atteindre
 * la boîte `mvhd`, puisque le dépôt n'accepte que des fichiers dont la table
 * précède les données.
 *
 * `null` en cas de doute — en-tête illisible, plage refusée, diffuseur muet.
 * L'appelant conserve alors la valeur annoncée : une durée approximative vaut
 * mieux qu'une durée effacée.
 */
export async function lireDureeDepuisStockage(
  cle: string,
  utilisateurId: string,
  origine?: string,
): Promise<number | null> {
  try {
    const url = await urlLectureSignee(cle, utilisateurId, 'fichier')
    // En développement la base est la route locale `/medias` : un `fetch`
    // serveur exige une adresse absolue.
    const absolue = url.startsWith('/') ? `${(origine ?? '').replace(/\/+$/, '')}${url}` : url
    if (absolue.startsWith('/')) return null

    const reponse = await fetch(absolue, {
      headers: { range: `bytes=0-${OCTETS_ENTETE_MP4 - 1}` },
    })
    if (!reponse.ok) return null

    const duree = dureeMp4(await reponse.arrayBuffer())
    return duree && Number.isFinite(duree) && duree > 0 ? duree : null
  } catch {
    // La durée annoncée reste en place : ce n'est pas un motif d'échec du
    // dépôt, dont les octets sont déjà arrivés.
    return null
  }
}

/**
 * Jeton d'écriture remis au navigateur pour pousser les parts d'un dépôt.
 *
 * Il vaut une heure et se renouvelle sans rouvrir le téléversement : sur un
 * lien montant ouest-africain, sept cents mégaoctets dépassent volontiers
 * l'heure.
 */
export const DUREE_JETON_ECRITURE_SECONDES = 60 * 60

export async function jetonEcriture(
  action: string,
  cle: string,
  uploadId: string,
  utilisateurId: string,
): Promise<{ jeton: string; expiration: number; requete: string }> {
  const expiration = Math.floor(Date.now() / 1000) + DUREE_JETON_ECRITURE_SECONDES
  const jeton = await signer(
    messageEcriture(action, cle, uploadId, expiration, utilisateurId),
    secretVideo(),
  )
  const requete = new URLSearchParams({
    c: cle,
    t: uploadId,
    e: String(expiration),
    u: utilisateurId,
    j: jeton,
  }).toString()
  return { jeton, expiration, requete }
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
export function messageEcriture(
  action: string,
  cle: string,
  uploadId: string,
  expiration: number,
  utilisateurId: string,
): string {
  return `ecriture.${action}.${cle}.${uploadId}.${expiration}.${utilisateurId}`
}

export async function verifierEcriture(
  action: string,
  cle: string,
  uploadId: string,
  parametres: URLSearchParams,
  secret: string,
  maintenant = Math.floor(Date.now() / 1000),
): Promise<string | null> {
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

// --- Plan de contrôle du dépôt ---------------------------------------------

/**
 * Appel d'une route de dépôt du diffuseur.
 *
 * Le fichier ne passe jamais par ici : seules les quelques centaines d'octets
 * du plan de contrôle transitent — ouvrir, finaliser, abandonner, supprimer.
 * Les octets des parts vont directement du navigateur au diffuseur, ce qui est
 * la seule façon de faire passer sept cents mégaoctets malgré le plafond de
 * quatre mégaoctets et demi imposé à une requête applicative.
 */
async function appelerDiffuseur(
  action: string,
  cle: string,
  uploadId: string,
  utilisateurId: string,
  options: { methode: string; corps?: unknown },
): Promise<unknown> {
  const { requete } = await jetonEcriture(action, cle, uploadId, utilisateurId)
  const reponse = await fetch(`${baseVideo()}/_televersement/${action}?${requete}`, {
    method: options.methode,
    headers: options.corps ? { 'content-type': 'application/json' } : undefined,
    body: options.corps ? JSON.stringify(options.corps) : undefined,
  })

  if (reponse.status === 204) return null
  const texte = await reponse.text()
  if (!reponse.ok) {
    // Le message du diffuseur est remonté tel quel : c'est souvent le seul
    // indice utile quand le stockage refuse une part.
    throw createError({
      statusCode: 502,
      statusMessage: `Le diffuseur a refusé l’opération « ${action} » — ${texte.slice(0, 300)}`,
    })
  }
  return texte ? JSON.parse(texte) : null
}

export function ouvrirDepot(cle: string, utilisateurId: string) {
  return appelerDiffuseur('ouvrir', cle, '', utilisateurId, { methode: 'POST', corps: {} }) as Promise<{
    uploadId: string
    taillePart: number
  }>
}

export function terminerDepot(
  cle: string,
  uploadId: string,
  utilisateurId: string,
  parts: { n: number; etag: string }[],
) {
  return appelerDiffuseur('terminer', cle, uploadId, utilisateurId, {
    methode: 'POST',
    corps: { parts: parts.map((p) => ({ partNumber: p.n, etag: p.etag })) },
  }) as Promise<{ taille: number; etag: string }>
}

export function abandonnerDepot(cle: string, uploadId: string, utilisateurId: string) {
  return appelerDiffuseur('abandonner', cle, uploadId, utilisateurId, { methode: 'POST', corps: {} })
}

export function supprimerObjet(cle: string, utilisateurId: string) {
  return appelerDiffuseur('objet', cle, '', utilisateurId, { methode: 'DELETE' }) as Promise<{
    supprimes: number
  }>
}

/**
 * Clé d'un chapitre : le module, la position, et six caractères tirés au sort.
 *
 * Le suffixe aléatoire n'est pas un ornement. Un remplacement de vidéo doit
 * produire une clé neuve, sans quoi le cache d'un an posé sur les fichiers
 * servirait l'ancienne version pendant des mois. Il rend aussi l'unicité
 * automatique et l'objet indevinable.
 */
export function cleChapitre(slugModule: string, position: number): string {
  const hasard = Math.random().toString(16).slice(2, 8)
  const numero = String(position + 1).padStart(2, '0')
  return `${slugModule.slice(0, 62)}-ch${numero}-${hasard}`
}
