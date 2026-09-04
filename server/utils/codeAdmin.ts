import type { Utilisateur } from '#shared/types'
import { supabase } from '../database/client'
import {
  consommerCodeVerification,
  creerCodeVerification,
  dernierCodeVerification,
} from '../database/comptes'
import { genererCode6, hacherJeton } from './motDePasse'
import { notifierCompte } from './notifications'

/**
 * Code de la double vérification admin (planche C, écran 08) : émission et
 * contrôle, selon le fournisseur configuré par `CODE_ADMIN_FOURNISSEUR`.
 *
 * - `interne` : code tiré ici, empreinte dans `codes_verification`, envoi par
 *   `notifier()` (sortie serveur tant qu'aucun fournisseur d'envoi n'existe).
 * - `supabase-auth` : Supabase Auth émet et vérifie le code à six chiffres
 *   (`signInWithOtp` / `verifyOtp`) et l'envoie avec son propre SMTP. Le
 *   gabarit « Magic Link » du projet doit contenir `{{ .Token }}`, sinon
 *   l'e-mail ne porte qu'un lien. Le SMTP intégré est limité à quelques envois
 *   par heure : suffisant pour une équipe, pas pour un public. Supabase impose
 *   lui-même une minute entre deux envois à la même adresse.
 * - `aucun` : double vérification suspendue, le mot de passe ouvre la session
 *   admin directement. À réserver au temps où aucun envoi n'est configuré.
 */
export type FournisseurCode = 'interne' | 'supabase-auth' | 'aucun'

export const CODE_VALIDITE_MINUTES = 10
const DELAI_RENVOI_SECONDES = 60

export function fournisseurCode(): FournisseurCode {
  const nom = (process.env.CODE_ADMIN_FOURNISSEUR || useRuntimeConfig().codeAdminFournisseur || 'interne').trim()
  if (nom === 'supabase-auth' || nom === 'aucun') return nom
  return 'interne'
}

export type ResultatCode = 'ok' | 'incorrect' | 'expire' | 'epuise'

export async function emettreCode(compte: Utilisateur): Promise<void> {
  if (fournisseurCode() === 'supabase-auth') {
    const { error } = await supabase().auth.signInWithOtp({
      email: compte.email,
      // Le compte Supabase Auth ne sert qu'au transport du code : il est créé
      // au premier envoi et n'ouvre aucun droit — la session reste la nôtre.
      options: { shouldCreateUser: true },
    })
    if (error) {
      // Supabase renvoie 429 quand l'adresse vient de recevoir un code.
      const trop = error.status === 429
      throw createError({
        statusCode: trop ? 429 : 502,
        statusMessage: trop
          ? 'Un code vient de partir : patientez une minute.'
          : `Envoi du code impossible (${error.message}).`,
      })
    }
    return
  }

  const dernier = await dernierCodeVerification(compte.id)
  if (dernier && Date.now() - new Date(dernier).getTime() < DELAI_RENVOI_SECONDES * 1000) {
    throw createError({ statusCode: 429, statusMessage: 'Un code vient de partir : patientez une minute.' })
  }
  const { clair, hache } = genererCode6()
  await creerCodeVerification(compte.id, hache)
  await notifierCompte(compte, 'code-verification', {
    prenom: compte.prenom,
    code: clair,
    validiteMinutes: String(CODE_VALIDITE_MINUTES),
  })
}

export async function controlerCode(compte: Utilisateur, code: string): Promise<ResultatCode> {
  if (fournisseurCode() === 'supabase-auth') {
    const { error } = await supabase().auth.verifyOtp({ email: compte.email, token: code, type: 'email' })
    if (!error) return 'ok'
    // Supabase répond « Token has expired or is invalid » dans les deux cas :
    // on ne peut pas distinguer un code faux d'un code périmé.
    if (error.status === 429) return 'epuise'
    return 'incorrect'
  }
  return await consommerCodeVerification(compte.id, hacherJeton(code))
}
