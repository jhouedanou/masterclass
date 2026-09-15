import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { hacherJeton } from '../utils/motDePasse'
import { supabase } from './client'
import { verifier, verifierOptionnel, verifierUn } from './erreurs'

/**
 * Secret TOTP et codes de secours : lecture, écriture, chiffrement au repos.
 *
 * C'est ici que passe la frontière entre le secret en mémoire — dont
 * `server/utils/totp.ts` a besoin en clair pour calculer un code — et sa forme
 * stockée. Le secret ne peut pas être haché comme un mot de passe : il doit
 * être relu à chaque vérification. Le chiffrer évite qu'une fuite de la base
 * suffise à fabriquer des codes valides.
 *
 * La clé vient de `TOTP_CLE`, distincte du scellement de session : compromettre
 * l'une ne doit pas livrer l'autre.
 */

const ALGORITHME = 'aes-256-gcm'

/**
 * Clé de chiffrement, dérivée de `TOTP_CLE` par SHA-256 pour obtenir les 32
 * octets qu'exige AES-256 quelle que soit la longueur saisie.
 *
 * Porte fermée par défaut, comme `exigerCleTache` : sans clé configurée, on
 * refuse plutôt que d'écrire un secret en clair — une variable oubliée ne doit
 * pas dégrader silencieusement la sécurité.
 */
function cle(): Buffer {
  const brute = (process.env.TOTP_CLE || useRuntimeConfig().totpCle || '').trim()
  if (brute.length < 32) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'TOTP_CLE absente ou trop courte (32 caractères minimum) : double authentification indisponible.',
    })
  }
  return createHash('sha256').update(brute).digest()
}

/** Format stocké : `<iv hex>.<étiquette hex>.<chiffré hex>`. L'étiquette GCM
 *  voyage avec le message — sans elle, le déchiffrement ne peut pas détecter
 *  une altération. */
function chiffrer(clair: string): string {
  const iv = randomBytes(12)
  const chiffreur = createCipheriv(ALGORITHME, cle(), iv)
  const corps = Buffer.concat([chiffreur.update(clair, 'utf8'), chiffreur.final()])
  return `${iv.toString('hex')}.${chiffreur.getAuthTag().toString('hex')}.${corps.toString('hex')}`
}

function dechiffrer(stocke: string): string | null {
  const [ivHex, etiquetteHex, corpsHex] = stocke.split('.')
  if (!ivHex || !etiquetteHex || !corpsHex) return null
  try {
    const dechiffreur = createDecipheriv(ALGORITHME, cle(), Buffer.from(ivHex, 'hex'))
    dechiffreur.setAuthTag(Buffer.from(etiquetteHex, 'hex'))
    return Buffer.concat([
      dechiffreur.update(Buffer.from(corpsHex, 'hex')),
      dechiffreur.final(),
    ]).toString('utf8')
  } catch {
    // Étiquette invalide : clé changée, ou donnée altérée. On refuse le secret
    // plutôt que de laisser passer — le compte repasse par un enrôlement.
    return null
  }
}

export type EtatTotp = {
  secret: string | null
  activeLe: string | null
  dernierPas: number | null
}

/** État TOTP d'un compte, secret déchiffré. Jamais renvoyé tel quel au client. */
export async function lireTotp(utilisateurId: string): Promise<EtatTotp> {
  const row = verifierOptionnel(
    await supabase()
      .from('utilisateurs')
      .select('totp_secret, totp_active_le, totp_dernier_pas')
      .eq('id', utilisateurId)
      .maybeSingle(),
    'double authentification',
  )
  return {
    secret: row?.totp_secret ? dechiffrer(row.totp_secret) : null,
    activeLe: row?.totp_active_le ?? null,
    dernierPas: row?.totp_dernier_pas ?? null,
  }
}

/** Dépose un secret sans l'activer : l'enrôlement n'est confirmé qu'après un
 *  premier code correct. */
export async function deposerSecret(utilisateurId: string, secret: string): Promise<void> {
  verifierUn(
    await supabase()
      .from('utilisateurs')
      .update({ totp_secret: chiffrer(secret), totp_active_le: null, totp_dernier_pas: null })
      .eq('id', utilisateurId)
      .select('id')
      .maybeSingle(),
    'dépôt du secret',
    'Compte introuvable',
  )
}

export async function activerTotp(utilisateurId: string, pas: number): Promise<void> {
  verifierUn(
    await supabase()
      .from('utilisateurs')
      .update({ totp_active_le: new Date().toISOString(), totp_dernier_pas: pas })
      .eq('id', utilisateurId)
      .select('id')
      .maybeSingle(),
    'activation de la double authentification',
    'Compte introuvable',
  )
}

/** Retient le pas consommé. Tout pas inférieur ou égal sera refusé ensuite. */
export async function marquerPas(utilisateurId: string, pas: number): Promise<void> {
  verifier(
    await supabase()
      .from('utilisateurs')
      .update({ totp_dernier_pas: pas })
      .eq('id', utilisateurId)
      .select('id'),
    'pas de temps consommé',
  )
}

/** Remise à zéro : le compte devra se réenrôler. Sert au téléphone perdu sans
 *  code de secours, sur décision d'un administrateur supérieur. */
export async function reinitialiserTotp(utilisateurId: string): Promise<void> {
  verifier(
    await supabase()
      .from('utilisateurs')
      .update({ totp_secret: null, totp_active_le: null, totp_dernier_pas: null })
      .eq('id', utilisateurId)
      .select('id'),
    'réinitialisation de la double authentification',
  )
  verifier(
    await supabase().from('codes_secours').delete().eq('utilisateur_id', utilisateurId).select('id'),
    'retrait des codes de secours',
  )
}

// --- Codes de secours -------------------------------------------------------

/** Huit codes : assez pour tenir plusieurs incidents, assez peu pour être
 *  recopiés à la main. */
const NOMBRE_CODES = 8

/**
 * Alphabet sans les caractères qui se confondent à la lecture — ni O/0, ni
 * I/l/1. Ces codes sont recopiés depuis un papier, souvent dans l'urgence.
 */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

function tirerCode(): string {
  const octets = randomBytes(10)
  const corps = [...octets].map((o) => ALPHABET[o % ALPHABET.length]).join('')
  return `${corps.slice(0, 5)}-${corps.slice(5)}`
}

/** Remplace les codes existants et renvoie les nouveaux **en clair** : c'est la
 *  seule fois où ils sont lisibles, la base n'en garde que l'empreinte. */
export async function regenererCodesSecours(utilisateurId: string): Promise<string[]> {
  verifier(
    await supabase().from('codes_secours').delete().eq('utilisateur_id', utilisateurId).select('id'),
    'retrait des anciens codes de secours',
  )
  const codes = Array.from({ length: NOMBRE_CODES }, tirerCode)
  verifier(
    await supabase()
      .from('codes_secours')
      .insert(codes.map((code) => ({ utilisateur_id: utilisateurId, empreinte: hacherJeton(code) })))
      .select('id'),
    'création des codes de secours',
  )
  return codes
}

/**
 * Consomme un code de secours. Renvoie le nombre de codes restants, ou `null`
 * si le code est inconnu ou déjà utilisé.
 *
 * La comparaison porte sur l'empreinte : le code en clair n'est jamais en base.
 */
export async function consommerCodeSecours(
  utilisateurId: string,
  code: string,
): Promise<number | null> {
  const normalise = code.trim().toUpperCase()
  const ligne = verifierOptionnel(
    await supabase()
      .from('codes_secours')
      .select('id')
      .eq('utilisateur_id', utilisateurId)
      .eq('empreinte', hacherJeton(normalise))
      .is('utilise_le', null)
      .maybeSingle(),
    'code de secours',
  )
  if (!ligne) return null

  verifierUn(
    await supabase()
      .from('codes_secours')
      .update({ utilise_le: new Date().toISOString() })
      // `is('utilise_le', null)` à nouveau : deux requêtes simultanées avec le
      // même code ne doivent pas le consommer deux fois.
      .eq('id', ligne.id)
      .is('utilise_le', null)
      .select('id')
      .maybeSingle(),
    'consommation du code de secours',
    'Code déjà utilisé',
  )

  const restants = verifier(
    await supabase()
      .from('codes_secours')
      .select('id')
      .eq('utilisateur_id', utilisateurId)
      .is('utilise_le', null),
    'codes de secours restants',
  )
  return restants.length
}

export async function compterCodesSecours(utilisateurId: string): Promise<number> {
  const rows = verifier(
    await supabase()
      .from('codes_secours')
      .select('id')
      .eq('utilisateur_id', utilisateurId)
      .is('utilise_le', null),
    'codes de secours',
  )
  return rows.length
}
