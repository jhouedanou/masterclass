import type { Utilisateur } from '#shared/types'
import { supabase } from '../database/client'
import {
  consommerCodeVerification,
  creerCodeVerification,
  dernierCodeVerification,
} from '../database/comptes'
import { consommerCodeSecours, lireTotp, marquerPas } from '../database/totp'
import { genererCode6, hacherJeton } from './motDePasse'
import { notifierCompte } from './notifications'
import { verifierTotp } from './totp'

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
 * - `totp` : application d'authentification (RFC 6238). Rien n'est envoyé —
 *   c'est tout l'intérêt : ni e-mail à attendre, ni SMTP à configurer. Le
 *   secret est partagé une fois à l'enrôlement, les codes se calculent ensuite
 *   hors ligne de part et d'autre. Voir `server/utils/totp.ts`.
 * - `aucun` : double vérification suspendue, le mot de passe ouvre la session
 *   admin directement. À réserver au temps où aucun envoi n'est configuré, et
 *   à la sortie de secours si plus personne ne peut s'enrôler.
 */
export type FournisseurCode = 'interne' | 'supabase-auth' | 'aucun' | 'totp'

export const CODE_VALIDITE_MINUTES = 10
const DELAI_RENVOI_SECONDES = 60

export function fournisseurCode(): FournisseurCode {
  const nom = (process.env.CODE_ADMIN_FOURNISSEUR || useRuntimeConfig().codeAdminFournisseur || 'interne').trim()
  if (nom === 'supabase-auth' || nom === 'aucun' || nom === 'totp') return nom
  return 'interne'
}

export type ResultatCode = 'ok' | 'incorrect' | 'expire' | 'epuise'

export async function emettreCode(compte: Utilisateur): Promise<void> {
  // Rien à émettre : l'application calcule le code de son côté. C'est
  // précisément ce qui supprime l'attente.
  if (fournisseurCode() === 'totp') return

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
  if (fournisseurCode() === 'totp') return await controlerTotp(compte, code)

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

/**
 * Contrôle d'un code d'application, ou à défaut d'un code de secours.
 *
 * L'ordre compte : les six chiffres sont le cas courant, le code de secours
 * l'exception. Un code de secours ne ressemble pas à six chiffres — il porte
 * des lettres et un tiret — donc `verifierTotp` l'écarte de lui-même sans
 * qu'on ait à deviner l'intention de l'utilisateur.
 *
 * Le pas de temps accepté est retenu aussitôt : tout pas inférieur ou égal sera
 * refusé ensuite, ce qui ferme la porte au rejeu du même code pendant sa durée
 * de vie.
 */
async function controlerTotp(compte: Utilisateur, code: string): Promise<ResultatCode> {
  const etat = await lireTotp(compte.id)
  // Sans secret actif, il n'y a rien à contrôler : l'appelant doit orienter
  // vers l'enrôlement plutôt que vers la saisie d'un code.
  if (!etat.secret || !etat.activeLe) return 'expire'

  const pas = verifierTotp(etat.secret, code, { pasMinimal: etat.dernierPas })
  if (pas !== null) {
    await marquerPas(compte.id, pas)
    return 'ok'
  }

  if (await consommerCodeSecours(compte.id, code) !== null) return 'ok'
  return 'incorrect'
}
