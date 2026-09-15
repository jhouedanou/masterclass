import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * Code à usage unique fondé sur le temps (TOTP, RFC 6238).
 *
 * L'application d'authentification et le serveur partagent un secret, une fois,
 * à l'enrôlement. Chacun en dérive ensuite le même code à six chiffres à partir
 * de l'heure courante. Rien ne transite à la connexion : ni e-mail à attendre,
 * ni SMTP à configurer, ni code à intercepter.
 *
 * Pas de dépendance npm, comme pour le JWT RS256 de `googleAgenda.ts` : TOTP
 * est un HMAC-SHA1 suivi d'une troncature, entièrement spécifié par la RFC, et
 * `node:crypto` fournit les deux. L'implémentation se vérifie sur les vecteurs
 * de test publiés par la RFC, ce qui vaut mieux qu'une confiance de principe.
 *
 * SHA-1 est bien l'algorithme de la RFC, et c'est ce que lisent toutes les
 * applications du marché. Son affaiblissement porte sur la résistance aux
 * collisions, sans effet ici : HMAC-SHA1 reste solide, et le code n'a de valeur
 * que trente secondes.
 */

/** Durée de vie d'un code. Trente secondes est la valeur qu'attendent les
 *  applications d'authentification ; la changer les désaccorderait. */
export const PAS_SECONDES = 30

/** Six chiffres : la longueur que toutes les applications affichent. */
const CHIFFRES = 6

/** Tolérance d'horloge, en pas. Un seul de part et d'autre : chaque pas
 *  supplémentaire élargit d'autant la fenêtre pendant laquelle un code
 *  intercepté reste rejouable. */
export const TOLERANCE_PAS = 1

const ALPHABET_BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** Base32 (RFC 4648), sans remplissage : la forme qu'attendent les URI
 *  `otpauth://` et les saisies manuelles de secret. */
export function encoderBase32(octets: Buffer): string {
  let bits = 0
  let valeur = 0
  let sortie = ''
  for (const octet of octets) {
    valeur = (valeur << 8) | octet
    bits += 8
    while (bits >= 5) {
      sortie += ALPHABET_BASE32[(valeur >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) sortie += ALPHABET_BASE32[(valeur << (5 - bits)) & 31]
  return sortie
}

export function decoderBase32(texte: string): Buffer {
  // Les applications affichent le secret par groupes de quatre, et le
  // remplissage `=` est facultatif : on accepte les deux.
  const propre = texte.replace(/[\s=]/g, '').toUpperCase()
  let bits = 0
  let valeur = 0
  const octets: number[] = []
  for (const caractere of propre) {
    const index = ALPHABET_BASE32.indexOf(caractere)
    if (index < 0) throw new Error(`Caractère hors base32 : ${caractere}`)
    valeur = (valeur << 5) | index
    bits += 5
    if (bits >= 8) {
      octets.push((valeur >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(octets)
}

/** Secret de 160 bits, la taille recommandée par la RFC 4226 pour HMAC-SHA1. */
export function genererSecret(): string {
  return encoderBase32(randomBytes(20))
}

/** Numéro du pas de temps courant. C'est lui qu'on retient pour interdire le
 *  rejeu, plutôt que le code : deux comptes peuvent tirer le même code. */
export function pasCourant(maintenant: number = Date.now()): number {
  return Math.floor(maintenant / 1000 / PAS_SECONDES)
}

/**
 * Code d'un pas donné (HOTP, RFC 4226 §5.3).
 *
 * `chiffres` n'est paramétrable que pour rejouer les vecteurs de test de la
 * RFC, qui sont donnés sur huit chiffres. La plateforme s'en tient à six.
 */
export function calculerCode(secret: Buffer, pas: number, chiffres: number = CHIFFRES): string {
  const compteur = Buffer.alloc(8)
  compteur.writeBigUInt64BE(BigInt(pas))

  const empreinte = createHmac('sha1', secret).update(compteur).digest()

  // Troncature dynamique : les quatre bits de poids faible du dernier octet
  // désignent où lire les quatre octets du code. Le bit de poids fort est
  // masqué pour que le nombre reste positif quelle que soit la plateforme.
  const decalage = empreinte[empreinte.length - 1]! & 0x0f
  const binaire =
    ((empreinte[decalage]! & 0x7f) << 24) |
    (empreinte[decalage + 1]! << 16) |
    (empreinte[decalage + 2]! << 8) |
    empreinte[decalage + 3]!

  return String(binaire % 10 ** chiffres).padStart(chiffres, '0')
}

/** Comparaison à temps constant : la durée de la réponse ne doit pas révéler
 *  combien de chiffres coïncident. */
function memeCode(attendu: string, saisi: string): boolean {
  const a = Buffer.from(attendu, 'utf8')
  const b = Buffer.from(saisi, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Vérifie un code et renvoie le pas de temps qui l'a validé, `null` sinon.
 *
 * Le pas est renvoyé — et non un simple booléen — pour que l'appelant le
 * conserve : refuser ensuite tout pas inférieur ou égal ferme la porte au
 * rejeu. Sans cela, un code lu par-dessus l'épaule reste utilisable pendant
 * toute sa durée de vie, et la tolérance d'horloge l'allonge encore.
 *
 * @param pasMinimal Dernier pas déjà consommé par ce compte, s'il y en a un.
 */
export function verifierTotp(
  secretBase32: string,
  code: string,
  options: { pasMinimal?: number | null; maintenant?: number } = {},
): number | null {
  const saisi = code.replace(/\s/g, '')
  if (!/^\d{6}$/.test(saisi)) return null

  const secret = decoderBase32(secretBase32)
  const centre = pasCourant(options.maintenant)

  for (let ecart = -TOLERANCE_PAS; ecart <= TOLERANCE_PAS; ecart++) {
    const pas = centre + ecart
    if (options.pasMinimal != null && pas <= options.pasMinimal) continue
    if (memeCode(calculerCode(secret, pas), saisi)) return pas
  }
  return null
}

/**
 * URI que l'application lit dans le QR code.
 *
 * L'étiquette porte l'émetteur et l'adresse — c'est ce qui s'affiche dans la
 * liste des comptes de l'application, et ce qui évite de confondre deux
 * plateformes. `issuer` est répété en paramètre : les applications anciennes ne
 * lisent que l'un des deux.
 */
export function uriOtpauth(email: string, secretBase32: string, emetteur = 'E-Masterclass Big Five'): string {
  const etiquette = encodeURIComponent(`${emetteur}:${email}`)
  const parametres = new URLSearchParams({
    secret: secretBase32,
    issuer: emetteur,
    algorithm: 'SHA1',
    digits: String(CHIFFRES),
    period: String(PAS_SECONDES),
  })
  return `otpauth://totp/${etiquette}?${parametres}`
}

/** Secret présenté par groupes de quatre, pour la saisie manuelle quand le QR
 *  n'est pas scannable. */
export function secretLisible(secretBase32: string): string {
  return secretBase32.replace(/(.{4})/g, '$1 ').trim()
}
