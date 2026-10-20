import { randomBytes, randomInt, scrypt, timingSafeEqual, createHash } from 'node:crypto'
import type { ScryptOptions } from 'node:crypto'
import { promisify } from 'node:util'

// `promisify` ne retient que la première surcharge de `scrypt`, celle sans
// options : on redonne la signature complète.
const scryptAsync = promisify(scrypt) as (
  motDePasse: string,
  sel: Buffer,
  longueur: number,
  options: ScryptOptions,
) => Promise<Buffer>

/**
 * Hachage des mots de passe.
 *
 * scrypt est fourni par Node : pas de dépendance native à compiler, et c'est
 * une fonction de dérivation à coût mémoire, donc résistante au calcul massif
 * sur GPU — contrairement à un simple SHA.
 *
 * Format stocké : `scrypt$<N>$<r>$<p>$<sel hex>$<empreinte hex>`. Les
 * paramètres voyagent avec l'empreinte : on pourra les durcir plus tard sans
 * invalider les mots de passe existants.
 */
const N = 16384 // 2^14 — ~16 Mo de mémoire par calcul.
const R = 8
const P = 1
const LONGUEUR = 64

/** En deçà, un mot de passe ne protège rien. */
export const LONGUEUR_MINIMALE = 10

/**
 * @param selFixe Réservé à la génération du jeu de démonstration
 * (`scripts/generer-seed.ts`). Un sel dérivé de l'identifiant du compte rend le
 * fichier de seed reproductible : sans cela, chaque régénération réécrit six
 * lignes de hachages et noie les vraies modifications dans le bruit. Ces
 * comptes ont un mot de passe public, à changer avant toute ouverture — voir
 * TODO.md. Le code applicatif ne passe jamais ce paramètre : un sel prévisible
 * sur un compte réel permettrait de précalculer les empreintes.
 */
export async function hacherMotDePasse(motDePasse: string, selFixe?: Buffer): Promise<string> {
  const sel = selFixe ?? randomBytes(16)
  const empreinte = await scryptAsync(motDePasse.normalize('NFKC'), sel, LONGUEUR, {
    N,
    r: R,
    p: P,
    // scrypt refuse de s'exécuter si le coût dépasse la limite mémoire par défaut.
    maxmem: 64 * 1024 * 1024,
  })

  return `scrypt$${N}$${R}$${P}$${sel.toString('hex')}$${empreinte.toString('hex')}`
}

/**
 * Empreinte d'un mot de passe que personne ne connaît, aux paramètres courants.
 * Elle sert de cible quand le compte n'existe pas ou n'a pas de mot de passe.
 */
const EMPREINTE_FACTICE = `scrypt$${N}$${R}$${P}$${'00'.repeat(16)}$${'00'.repeat(LONGUEUR)}`

/**
 * Vérifie un mot de passe. La comparaison est à temps constant : la durée de
 * la réponse ne révèle pas jusqu'où les deux empreintes coïncident.
 *
 * Sans empreinte — adresse inconnue, compte sans mot de passe —, un scrypt est
 * tout de même calculé sur une empreinte factice : répondre aussitôt faisait
 * de la durée de la connexion un test d'existence des comptes, à 16 Mo et
 * quelques dizaines de millisecondes près.
 */
export async function verifierMotDePasse(
  motDePasse: string,
  stocke: string | null,
): Promise<boolean> {
  if (!stocke) {
    await verifierMotDePasse(motDePasse, EMPREINTE_FACTICE)
    return false
  }

  const [algo, n, r, p, selHex, empreinteHex] = stocke.split('$')
  if (algo !== 'scrypt' || !selHex || !empreinteHex) return false

  const attendue = Buffer.from(empreinteHex, 'hex')
  const calculee = await scryptAsync(
    motDePasse.normalize('NFKC'),
    Buffer.from(selHex, 'hex'),
    attendue.length,
    { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 },
  )

  return attendue.length === calculee.length && timingSafeEqual(attendue, calculee)
}

/** Jeton de réinitialisation : la valeur en clair part par e-mail, seule son
 *  empreinte est conservée en base. Un vol de la table ne permet donc pas de
 *  forger un lien valide. */
export function creerJeton() {
  const clair = randomBytes(32).toString('base64url')
  return { clair, hache: hacherJeton(clair) }
}

/** SHA-256 suffit ici : le jeton est déjà 256 bits d'aléa, il n'a pas la
 *  faible entropie d'un mot de passe choisi par un humain. */
export function hacherJeton(jeton: string): string {
  return createHash('sha256').update(jeton).digest('hex')
}

/** Code de vérification à six chiffres (planche C, écran 08), tiré au sort
 *  de façon cryptographique. Seule son empreinte est conservée. */
export function genererCode6(): { clair: string; hache: string } {
  const clair = String(randomInt(0, 1_000_000)).padStart(6, '0')
  return { clair, hache: hacherJeton(clair) }
}

/** Refus des mots de passe trop courts. Message rendu tel quel à l'écran. */
export function refusMotDePasse(motDePasse: string): string | null {
  if (motDePasse.length < LONGUEUR_MINIMALE) {
    return `Le mot de passe doit contenir au moins ${LONGUEUR_MINIMALE} caractères.`
  }
  return null
}
