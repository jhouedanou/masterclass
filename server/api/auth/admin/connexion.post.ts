import { enregistrerTentative, trouverIdentifiants } from '../../../database/comptes'
import { emettreCode, fournisseurCode } from '../../../utils/codeAdmin'
import { verifierMotDePasse } from '../../../utils/motDePasse'
import { ouvrirSessionPartielle } from '../../../utils/session'

const VERROU =
  'Trop de tentatives : ce compte est bloqué 30 minutes. Réessayez plus tard ou réinitialisez votre mot de passe.'

/** « f***@bigfive.ci » : on confirme où part le code sans le révéler. */
function masquer(email: string): string {
  const [local = '', domaine = ''] = email.split('@')
  return `${local.slice(0, 1)}***@${domaine}`
}

/**
 * Connexion admin, étape 1 (planche C, écran 08) : mêmes règles que la
 * connexion apprenant — journalisation, verrouillage après cinq échecs — mais
 * la session ne s'ouvre pas : un code à six chiffres part par e-mail et
 * WhatsApp, valable dix minutes.
 */
export default defineEventHandler(async (event) => {
  const { email, motDePasse } = await readBody<{ email?: string; motDePasse?: string }>(event)
  const adresse = (email ?? '').trim()
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? null
  const appareil = getRequestHeader(event, 'user-agent') ?? null

  if (!adresse || !motDePasse) {
    throw createError({ statusCode: 422, statusMessage: 'Renseignez votre adresse e-mail et votre mot de passe.' })
  }

  const identifiants = await trouverIdentifiants(adresse)
  const verrou = identifiants?.utilisateur.verrouilleJusquA
  if (verrou && new Date(verrou) > new Date()) {
    throw createError({ statusCode: 429, statusMessage: VERROU })
  }

  const role = identifiants?.utilisateur.role
  const estAdmin = role === 'admin-contenu' || role === 'admin-superieur'
  const valide =
    identifiants !== null && estAdmin && (await verifierMotDePasse(motDePasse, identifiants.motDePasseHache))

  const verrouille = await enregistrerTentative(adresse, ip, appareil, valide)
  if (!valide) {
    if (verrouille) throw createError({ statusCode: 429, statusMessage: VERROU })
    // Même message qu'un compte inconnu : un compte apprenant n'est pas
    // reconnu ici, sans le dire.
    throw createError({ statusCode: 401, statusMessage: 'Adresse e-mail ou mot de passe incorrect.' })
  }

  const compte = identifiants.utilisateur
  await emettreCode(compte)
  await ouvrirSessionPartielle(event, compte.id)

  return {
    etape: 'code' as const,
    masque: masquer(compte.email),
    // Supabase Auth n'envoie que par e-mail ; le canal WhatsApp attend le pilote interne.
    whatsapp: fournisseurCode() === 'interne' && Boolean(compte.whatsapp),
    fournisseur: fournisseurCode(),
  }
})
