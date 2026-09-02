import type { Acces, Persona, PreferencesNotifications, SectionAdmin, Utilisateur } from '#shared/types'
import { supabase } from './client'
import { traduireErreur, verifier, verifierOptionnel, verifierUn } from './erreurs'
import { versAcces, versPersona, versUtilisateur } from './mappers'

/** Comptes, personas et accès aux modules. */

// --- Utilisateurs ----------------------------------------------------------

export async function listerUtilisateurs(): Promise<Utilisateur[]> {
  const rows = verifier(await supabase().from('utilisateurs').select('*').order('id'), 'comptes')
  return rows.map(versUtilisateur)
}

/** Un compte supprimé par son titulaire n'existe plus pour la session ni pour
 *  la connexion — seules les écritures comptables le référencent encore. */
export async function trouverUtilisateur(id: string): Promise<Utilisateur | null> {
  const row = verifierOptionnel(
    await supabase().from('utilisateurs').select('*').eq('id', id).is('supprime_le', null).maybeSingle(),
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
    await supabase()
      .from('utilisateurs')
      .select('*')
      .ilike('email', email.trim())
      .is('supprime_le', null)
      .maybeSingle(),
    'identifiants',
  )
  if (!row) return null
  return { utilisateur: versUtilisateur(row), motDePasseHache: row.mot_de_passe_hache }
}

/** Empreinte du mot de passe d'un compte connecté, pour vérifier le mot de
 *  passe courant avant un changement sensible. */
export async function trouverEmpreinte(utilisateurId: string): Promise<string | null> {
  const row = verifierOptionnel(
    await supabase().from('utilisateurs').select('mot_de_passe_hache').eq('id', utilisateurId).maybeSingle(),
    'empreinte',
  )
  return row?.mot_de_passe_hache ?? null
}

// --- Compte de l'apprenant (planche B, écrans 04, 11 et 12) ----------------

export async function majProfilUtilisateur(
  id: string,
  champs: { prenom: string; nom: string; whatsapp?: string; pays?: string },
): Promise<Utilisateur> {
  const row = verifierUn(
    await supabase()
      .from('utilisateurs')
      .update({
        prenom: champs.prenom,
        nom: champs.nom,
        whatsapp: champs.whatsapp ?? null,
        pays: champs.pays ?? null,
      })
      .eq('id', id)
      .select('*')
      .maybeSingle(),
    'mise à jour du profil',
    'Compte introuvable',
  )
  return versUtilisateur(row)
}

export async function majEmail(id: string, email: string): Promise<Utilisateur> {
  const { data, error } = await supabase()
    .from('utilisateurs')
    .update({ email })
    .eq('id', id)
    .select('*')
    .maybeSingle()
  if (error?.code === '23505') {
    throw createError({ statusCode: 409, statusMessage: 'Un compte existe déjà avec cet e-mail' })
  }
  if (error) throw traduireErreur(error, 'changement d’e-mail')
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Compte introuvable' })
  return versUtilisateur(data)
}

export async function majPreferencesNotifications(
  id: string,
  preferences: PreferencesNotifications,
): Promise<Utilisateur> {
  const row = verifierUn(
    await supabase()
      .from('utilisateurs')
      .update({ preferences_notifications: preferences })
      .eq('id', id)
      .select('*')
      .maybeSingle(),
    'préférences de notification',
    'Compte introuvable',
  )
  return versUtilisateur(row)
}

/**
 * Suppression douce (planche B, écran 12). Le compte devient inaccessible et
 * son e-mail est libéré pour une éventuelle réinscription ; commandes,
 * transactions et certificats restent rattachés à l'identifiant.
 */
export async function marquerSupprime(id: string): Promise<void> {
  verifierUn(
    await supabase()
      .from('utilisateurs')
      .update({
        supprime_le: new Date().toISOString(),
        mot_de_passe_hache: null,
        email: `supprime-${id}@compte-supprime.invalid`,
        whatsapp: null,
      })
      .eq('id', id)
      .is('supprime_le', null)
      .select('id')
      .maybeSingle(),
    'suppression du compte',
    'Compte introuvable',
  )
}

export async function trouverPersona(utilisateurId: string): Promise<Persona | null> {
  const row = verifierOptionnel(
    await supabase().from('personas').select('*').eq('utilisateur_id', utilisateurId).maybeSingle(),
    'persona',
  )
  return row ? versPersona(row) : null
}

/** La fiche apprenant est complète dès que le secteur et l'objectif sont
 *  renseignés : c'est ce que le formateur attend avant une session. */
export async function majPersona(utilisateurId: string, persona: Persona): Promise<Persona> {
  const row = verifier(
    await supabase()
      .from('personas')
      .upsert(
        {
          utilisateur_id: utilisateurId,
          age: persona.age ?? null,
          secteur: persona.secteur?.trim() || null,
          experience: persona.experience?.trim() || null,
          reseaux: persona.reseaux?.trim() || null,
          objectif: persona.objectif?.trim() || null,
        },
        { onConflict: 'utilisateur_id' },
      )
      .select('*')
      .single(),
    'fiche apprenant',
  )
  const complete = Boolean(row.secteur && row.objectif)
  verifier(
    await supabase().from('utilisateurs').update({ fiche_completee: complete }).eq('id', utilisateurId).select('id'),
    'état de la fiche apprenant',
  )
  return versPersona(row)
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

// --- Double vérification (planche C, écran 08) -----------------------------

/** Validité d'un code, en minutes, et nombre d'essais avant de le brûler. */
export const CODE_VALIDITE_MINUTES = 10
export const CODE_TENTATIVES_MAX = 5

/** Pose un nouveau code et périme les précédents encore ouverts : un seul
 *  code vaut à la fois. Renvoie la date du dernier envoi pour espacer les
 *  renvois. */
export async function creerCodeVerification(utilisateurId: string, codeHache: string): Promise<void> {
  const maintenant = new Date().toISOString()
  verifier(
    await supabase()
      .from('codes_verification')
      .update({ utilise_le: maintenant })
      .eq('utilisateur_id', utilisateurId)
      .is('utilise_le', null)
      .select('id'),
    'péremption des codes précédents',
  )
  verifier(
    await supabase()
      .from('codes_verification')
      .insert({
        utilisateur_id: utilisateurId,
        code_hache: codeHache,
        expire_le: new Date(Date.now() + CODE_VALIDITE_MINUTES * 60 * 1000).toISOString(),
      })
      .select('id'),
    'code de vérification',
  )
}

/** Date d'émission du dernier code ouvert, pour limiter les renvois. */
export async function dernierCodeVerification(utilisateurId: string): Promise<string | null> {
  const row = verifierOptionnel(
    await supabase()
      .from('codes_verification')
      .select('cree_le')
      .eq('utilisateur_id', utilisateurId)
      .is('utilise_le', null)
      .order('cree_le', { ascending: false })
      .limit(1)
      .maybeSingle(),
    'dernier code',
  )
  return row?.cree_le ?? null
}

/**
 * Vérifie un code. Un code juste est consommé ; un code faux décompte un essai
 * et, au cinquième, le code est brûlé — il faut en redemander un.
 */
export async function consommerCodeVerification(
  utilisateurId: string,
  codeHache: string,
): Promise<'ok' | 'incorrect' | 'expire' | 'epuise'> {
  const code = verifierOptionnel(
    await supabase()
      .from('codes_verification')
      .select('*')
      .eq('utilisateur_id', utilisateurId)
      .is('utilise_le', null)
      .order('cree_le', { ascending: false })
      .limit(1)
      .maybeSingle(),
    'code de vérification',
  )
  if (!code || new Date(code.expire_le) < new Date()) return 'expire'

  if (code.code_hache !== codeHache) {
    const tentatives = code.tentatives + 1
    const epuise = tentatives >= CODE_TENTATIVES_MAX
    verifier(
      await supabase()
        .from('codes_verification')
        .update({ tentatives, utilise_le: epuise ? new Date().toISOString() : null })
        .eq('id', code.id)
        .select('id'),
      'tentative de code',
    )
    return epuise ? 'epuise' : 'incorrect'
  }

  verifier(
    await supabase()
      .from('codes_verification')
      .update({ utilise_le: new Date().toISOString() })
      .eq('id', code.id)
      .select('id'),
    'consommation du code',
  )
  return 'ok'
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

/**
 * Compte d'un formateur, rattaché à sa fiche (planche C, écran 07b). Sans mot
 * de passe : il en définit un depuis le lien d'invitation, sauf si l'équipe
 * lui en a communiqué un temporaire.
 */
export async function creerCompteFormateur(champs: {
  prenom: string
  nom: string
  email: string
  whatsapp?: string
  formateurId: string
  motDePasseHache?: string
}): Promise<Utilisateur> {
  const { data, error } = await supabase()
    .from('utilisateurs')
    .insert({
      prenom: champs.prenom,
      nom: champs.nom,
      email: champs.email,
      whatsapp: champs.whatsapp ?? null,
      role: 'formateur',
      formateur_id: champs.formateurId,
      mot_de_passe_hache: champs.motDePasseHache ?? null,
    })
    .select('*')
    .single()

  if (error?.code === '23505') {
    throw createError({ statusCode: 409, statusMessage: 'Un compte existe déjà avec cet e-mail' })
  }
  if (error) throw traduireErreur(error, 'création du compte formateur')
  return versUtilisateur(data)
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
/**
 * Relevé du temps réellement visionné d'un chapitre.
 *
 * Le lecteur n'envoie qu'un cumul de secondes ; l'identifiant technique du
 * chapitre est retrouvé ici, à partir du module et du rang, pour que le client
 * n'ait jamais à manipuler d'identifiant de base. Le contrôle d'accès et le
 * recalcul de la progression sont portés par la fonction SQL, en une seule
 * transaction.
 */
export async function enregistrerVisionnage(
  utilisateurId: string,
  moduleId: string,
  position: number,
  secondesVues: number,
): Promise<number> {
  const chapitre = verifierOptionnel(
    await supabase()
      .from('chapitres')
      .select('id')
      .eq('module_id', moduleId)
      .eq('position', position)
      .maybeSingle(),
    'chapitre',
  )
  if (!chapitre) {
    throw createError({ statusCode: 404, statusMessage: 'Chapitre introuvable' })
  }

  const { data, error } = await supabase().rpc('enregistrer_visionnage', {
    p_utilisateur_id: utilisateurId,
    p_chapitre_id: chapitre.id,
    p_secondes_vues: secondesVues,
  })
  if (error) throw traduireErreur(error, 'relevé de visionnage')
  return data
}

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
