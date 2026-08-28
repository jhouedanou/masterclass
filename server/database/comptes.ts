import type { Acces, Persona, SectionAdmin, Utilisateur } from '#shared/types'
import { supabase } from './client'
import { traduireErreur, verifier, verifierOptionnel, verifierUn } from './erreurs'
import { versAcces, versPersona, versUtilisateur } from './mappers'

/** Comptes, personas et accès aux modules. */

// --- Utilisateurs ----------------------------------------------------------

export async function listerUtilisateurs(): Promise<Utilisateur[]> {
  const rows = verifier(await supabase().from('utilisateurs').select('*').order('id'), 'comptes')
  return rows.map(versUtilisateur)
}

export async function trouverUtilisateur(id: string): Promise<Utilisateur | null> {
  const row = verifierOptionnel(
    await supabase().from('utilisateurs').select('*').eq('id', id).maybeSingle(),
    'compte',
  )
  return row ? versUtilisateur(row) : null
}

/** La connexion se fait sur l'e-mail, sans distinction de casse — l'index
 *  unique sur `lower(email)` interdit par ailleurs les doublons. */
export async function trouverUtilisateurParEmail(email: string): Promise<Utilisateur | null> {
  const row = verifierOptionnel(
    await supabase()
      .from('utilisateurs')
      .select('*')
      .ilike('email', email.trim())
      .maybeSingle(),
    'compte par e-mail',
  )
  return row ? versUtilisateur(row) : null
}

export async function creerUtilisateur(champs: {
  prenom: string
  nom: string
  email: string
  whatsapp?: string
  pays?: string
  motDePasseHache: string
}): Promise<Utilisateur> {
  // L'identifiant est produit par la base (`usr-` + six caractères).
  const { data, error } = await supabase()
    .from('utilisateurs')
    .insert({
      prenom: champs.prenom,
      nom: champs.nom,
      email: champs.email,
      whatsapp: champs.whatsapp ?? null,
      pays: champs.pays ?? null,
      mot_de_passe_hache: champs.motDePasseHache,
    })
    .select('*')
    .single()

  // L'index unique sur `lower(email)` tranche aussi la course entre deux
  // inscriptions simultanées, qu'une simple vérification préalable laisserait
  // passer.
  if (error?.code === '23505') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Un compte existe déjà avec cet e-mail',
    })
  }
  if (error) throw traduireErreur(error, 'création du compte')

  return versUtilisateur(data)
}

// --- Authentification ------------------------------------------------------

/**
 * Identifiants d'un compte : le profil et l'empreinte du mot de passe.
 *
 * L'empreinte ne transite jamais par le type métier `Utilisateur`, qui part
 * dans les réponses d'API — d'où cette fonction distincte de
 * `trouverUtilisateurParEmail`.
 */
export async function trouverIdentifiants(
  email: string,
): Promise<{ utilisateur: Utilisateur; motDePasseHache: string | null } | null> {
  const row = verifierOptionnel(
    await supabase().from('utilisateurs').select('*').ilike('email', email.trim()).maybeSingle(),
    'identifiants',
  )
  if (!row) return null
  return { utilisateur: versUtilisateur(row), motDePasseHache: row.mot_de_passe_hache }
}

/**
 * Journalise la tentative et applique le verrouillage : cinq échecs en trente
 * minutes bloquent le compte pour la même durée et alertent l'administration.
 * Renvoie la date de déverrouillage lorsque le seuil vient d'être atteint.
 */
export async function enregistrerTentative(
  email: string,
  ip: string | null,
  appareil: string | null,
  reussie: boolean,
): Promise<string | null> {
  const { data, error } = await supabase().rpc('enregistrer_tentative_connexion', {
    p_email: email,
    p_ip: ip,
    p_appareil: appareil,
    p_reussie: reussie,
  })
  if (error) throw traduireErreur(error, 'journalisation de la connexion')
  return data
}

export async function definirMotDePasse(utilisateurId: string, hache: string): Promise<void> {
  verifier(
    await supabase()
      .from('utilisateurs')
      // Un changement de mot de passe lève aussi le verrouillage en cours.
      .update({ mot_de_passe_hache: hache, verrouille_jusqu_a: null })
      .eq('id', utilisateurId)
      .select('id'),
    'changement de mot de passe',
  )
}

export async function creerReinitialisation(
  utilisateurId: string,
  jetonHache: string,
  expireLe: Date,
): Promise<void> {
  verifier(
    await supabase()
      .from('reinitialisations_mot_de_passe')
      .insert({
        jeton_hache: jetonHache,
        utilisateur_id: utilisateurId,
        expire_le: expireLe.toISOString(),
      })
      .select('jeton_hache'),
    'demande de réinitialisation',
  )
}

/**
 * Valide un jeton de réinitialisation et le consomme dans la foulée : un lien
 * ne sert qu'une fois, et cesse d'être valable au bout de trente minutes.
 */
export async function consommerReinitialisation(jetonHache: string): Promise<string | null> {
  const ligne = verifierOptionnel(
    await supabase()
      .from('reinitialisations_mot_de_passe')
      .update({ utilise_le: new Date().toISOString() })
      .eq('jeton_hache', jetonHache)
      .is('utilise_le', null)
      .gt('expire_le', new Date().toISOString())
      .select('utilisateur_id')
      .maybeSingle(),
    'réinitialisation',
  )
  return ligne?.utilisateur_id ?? null
}

// --- Comptes d'administration ----------------------------------------------

/**
 * Comptes ayant accès au back-office. La maquette réserve leur gestion à la
 * section « Administration des accès » — elle-même un droit à cocher.
 */
export async function listerComptesAdmin(): Promise<Utilisateur[]> {
  const rows = verifier(
    await supabase()
      .from('utilisateurs')
      .select('*')
      .in('role', ['admin-contenu', 'admin-superieur'])
      .order('id'),
    "comptes d'administration",
  )
  return rows.map(versUtilisateur)
}

/**
 * Création d'un compte d'administration. Aucune section n'est cochée par
 * défaut : le compte ne verra que ce qu'on lui accorde explicitement.
 */
export async function creerCompteAdmin(champs: {
  prenom: string
  nom: string
  email: string
  whatsapp?: string
  motDePasseHache: string
  sections: SectionAdmin[]
  superieur: boolean
}): Promise<Utilisateur> {
  const { data, error } = await supabase()
    .from('utilisateurs')
    .insert({
      prenom: champs.prenom,
      nom: champs.nom,
      email: champs.email,
      whatsapp: champs.whatsapp ?? null,
      role: champs.superieur ? 'admin-superieur' : 'admin-contenu',
      sections_autorisees: champs.sections,
    })
    .select('*')
    .single()

  if (error?.code === '23505') {
    throw createError({ statusCode: 409, statusMessage: 'Un compte existe déjà avec cet e-mail' })
  }
  if (error) throw traduireErreur(error, "création du compte d'administration")

  await definirMotDePasse(data.id, champs.motDePasseHache)
  return versUtilisateur({ ...data, mot_de_passe_hache: champs.motDePasseHache })
}

export async function majSectionsAdmin(
  id: string,
  sections: SectionAdmin[],
): Promise<Utilisateur> {
  const row = verifierUn(
    await supabase()
      .from('utilisateurs')
      .update({ sections_autorisees: sections })
      .eq('id', id)
      .in('role', ['admin-contenu', 'admin-superieur'])
      .select('*')
      .maybeSingle(),
    'mise à jour des droits',
    "Compte d'administration introuvable",
  )
  return versUtilisateur(row)
}

/**
 * Révocation : le compte perd tous ses droits et redevient un apprenant. On ne
 * le supprime pas — le journal d'administration référence son nom, et un
 * historique amputé de son auteur ne vaut plus grand-chose.
 */
export async function revoquerCompteAdmin(id: string): Promise<void> {
  verifierUn(
    await supabase()
      .from('utilisateurs')
      .update({ role: 'apprenant', sections_autorisees: [], mot_de_passe_hache: null })
      .eq('id', id)
      .in('role', ['admin-contenu', 'admin-superieur'])
      .select('id')
      .maybeSingle(),
    'révocation',
    "Compte d'administration introuvable",
  )
}

// --- Personas --------------------------------------------------------------

/** Indexés par identifiant d'apprenant, comme l'attendaient les écrans admin. */
export async function listerPersonas(): Promise<Record<string, Persona>> {
  const rows = verifier(await supabase().from('personas').select('*'), 'personas')
  return Object.fromEntries(rows.map((row) => [row.utilisateur_id, versPersona(row)]))
}

// --- Accès -----------------------------------------------------------------

export async function listerAcces(): Promise<Acces[]> {
  const rows = verifier(await supabase().from('acces').select('*'), 'accès')
  return rows.map(versAcces)
}

export async function listerAccesUtilisateur(utilisateurId: string): Promise<Acces[]> {
  const rows = verifier(
    await supabase()
      .from('acces')
      .select('*')
      .eq('utilisateur_id', utilisateurId)
      .order('achete_le'),
    'accès de l’apprenant',
  )
  return rows.map(versAcces)
}

export async function trouverAcces(
  utilisateurId: string,
  moduleId: string,
): Promise<Acces | null> {
  const row = verifierOptionnel(
    await supabase()
      .from('acces')
      .select('*')
      .eq('utilisateur_id', utilisateurId)
      .eq('module_id', moduleId)
      .maybeSingle(),
    'accès',
  )
  return row ? versAcces(row) : null
}

/**
 * La progression est le point le plus avancé atteint : elle ne redescend pas.
 * C'est ce qui permet à `termine_le` de rester posé une fois le module réalisé,
 * comme l'exige la contrainte `acces_termine_coherent`.
 */
export async function majProgression(
  utilisateurId: string,
  moduleId: string,
  progression: number,
): Promise<Acces> {
  const actuel = await trouverAcces(utilisateurId, moduleId)
  if (!actuel) {
    throw createError({ statusCode: 404, statusMessage: 'Module non acquis' })
  }

  const valeur = Math.max(actuel.progression, Math.max(0, Math.min(100, Math.round(progression))))
  const termineLe =
    valeur === 100 ? (actuel.termineLe ?? new Date().toISOString().slice(0, 10)) : actuel.termineLe

  const row = verifierUn(
    await supabase()
      .from('acces')
      .update({ progression: valeur, termine_le: termineLe })
      .eq('utilisateur_id', utilisateurId)
      .eq('module_id', moduleId)
      .select('*')
      .maybeSingle(),
    'progression',
    'Module non acquis',
  )
  return versAcces(row)
}

/** Ouvre les accès d'une commande. Un module déjà possédé est ignoré plutôt
 *  que de faire échouer l'ensemble. */
export async function ouvrirAcces(utilisateurId: string, moduleIds: string[]): Promise<void> {
  if (!moduleIds.length) return
  verifier(
    await supabase()
      .from('acces')
      .upsert(
        moduleIds.map((module_id) => ({ utilisateur_id: utilisateurId, module_id })),
        { onConflict: 'utilisateur_id,module_id', ignoreDuplicates: true },
      )
      .select('utilisateur_id'),
    'ouverture des accès',
  )
}
