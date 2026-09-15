import { randomBytes } from 'node:crypto'
import type { Acces, Persona, PreferencesNotifications, ProgrammeSlug, SectionAdmin, Utilisateur } from '#shared/types'
import { calculerCompletionProfil } from '#shared/utils/profil'
import { SEAU_PHOTOS, type FormatPhoto } from '../utils/photos'
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

// --- Complétion de la fiche apprenant --------------------------------------

/**
 * Recalcule la complétion et reporte `fiche_completee`, source de vérité de
 * `reserver_place_session` (EM403).
 *
 * Toute écriture qui touche un champ compté doit passer par ici — la fiche
 * persona, mais aussi la photo, qui compte depuis qu'elle figure dans
 * `CHAMPS_COMMUNS`. Sans cet appel, déposer la dernière pièce manquante
 * afficherait 100 % sans rouvrir l'accès aux coaching sessions, et la retirer
 * laisserait le drapeau à vrai.
 */
async function reporterCompletion(
  utilisateurId: string,
  persona?: Persona | null,
  programme: ProgrammeSlug | null = null,
): Promise<number> {
  const utilisateur = await trouverUtilisateur(utilisateurId)
  const { pourcentage } = calculerCompletionProfil(
    utilisateur ?? { prenom: '', nom: '' },
    persona ?? (await trouverPersona(utilisateurId)),
    programme ?? (await programmeDeReference(utilisateurId)),
  )
  verifier(
    await supabase()
      .from('utilisateurs')
      .update({ fiche_completee: pourcentage === 100 })
      .eq('id', utilisateurId)
      .select('id'),
    'état de la fiche apprenant',
  )
  return pourcentage
}

// --- Photo de profil (planche B, écran 04) ---------------------------------

/** Chemin de la photo dans le seau, pour la remplacer ou la supprimer. */
async function cheminPhoto(utilisateurId: string): Promise<string | null> {
  const row = verifierOptionnel(
    await supabase().from('utilisateurs').select('photo').eq('id', utilisateurId).maybeSingle(),
    'photo de profil',
  )
  return row?.photo ?? null
}

/**
 * Efface un objet du seau. Volontairement silencieux : un fichier déjà absent
 * (seau purgé, double suppression) ne doit pas faire échouer l'opération
 * métier qui l'accompagne — le remplacement de la photo ou la suppression du
 * compte.
 */
async function effacerObjetPhoto(chemin: string | null): Promise<void> {
  if (!chemin) return
  await supabase().storage.from(SEAU_PHOTOS).remove([chemin])
}

/**
 * Dépose la photo de profil et la rattache au compte.
 *
 * Le nom de l'objet est entièrement fabriqué ici — identifiant du compte, puis
 * seize octets d'aléa et l'extension déduite des octets du fichier. Le nom
 * envoyé par le navigateur n'est jamais réutilisé : il porterait sinon des
 * séparateurs de chemin ou une extension mensongère.
 *
 * L'ancienne photo n'est effacée qu'une fois la nouvelle en place et la base à
 * jour : interrompu avant, le compte garde une photo valable, et au pire un
 * objet orphelin subsiste — préférable à un profil qui pointe vers le vide.
 */
export async function deposerPhoto(
  utilisateurId: string,
  contenu: Buffer,
  format: FormatPhoto,
): Promise<Utilisateur> {
  const ancien = await cheminPhoto(utilisateurId)
  const chemin = `${utilisateurId}/${randomBytes(16).toString('hex')}.${format.extension}`

  const { error } = await supabase()
    .storage.from(SEAU_PHOTOS)
    .upload(chemin, contenu, { contentType: format.type, upsert: false })
  if (error) {
    throw createError({
      statusCode: 502,
      statusMessage: `Dépôt de la photo impossible — ${error.message}`,
    })
  }

  let row
  try {
    row = verifierUn(
      await supabase().from('utilisateurs').update({ photo: chemin }).eq('id', utilisateurId).select('*').maybeSingle(),
      'photo de profil',
      'Compte introuvable',
    )
  } catch (erreur) {
    // La base a refusé : le fichier tout juste déposé n'est rattaché à rien.
    await effacerObjetPhoto(chemin)
    throw erreur
  }

  await effacerObjetPhoto(ancien)
  // La photo est un champ compté : elle peut porter la fiche à 100 %. Le compte
  // est relu après coup, sinon la réponse porterait le `fiche_completee`
  // d'avant le recalcul.
  await reporterCompletion(utilisateurId)
  return (await trouverUtilisateur(utilisateurId)) ?? versUtilisateur(row)
}

/** Retire la photo : le compte retombe sur ses initiales, et sous les 100 %. */
export async function retirerPhoto(utilisateurId: string): Promise<Utilisateur> {
  const ancien = await cheminPhoto(utilisateurId)
  const row = verifierUn(
    await supabase().from('utilisateurs').update({ photo: null }).eq('id', utilisateurId).select('*').maybeSingle(),
    'retrait de la photo',
    'Compte introuvable',
  )
  await effacerObjetPhoto(ancien)
  await reporterCompletion(utilisateurId)
  return (await trouverUtilisateur(utilisateurId)) ?? versUtilisateur(row)
}

/**
 * Suppression douce (planche B, écran 12). Le compte devient inaccessible et
 * son e-mail est libéré pour une éventuelle réinscription ; commandes,
 * transactions et certificats restent rattachés à l'identifiant.
 */
/** Nombre de jours entre la demande de suppression et la suppression définitive (planche B, écran 12). */
export const DELAI_SUPPRESSION_JOURS = 14

/**
 * Suppression programmée (planche B, écran 12, écran 3) : le compte est
 * désactivé, la suppression définitive intervient quatorze jours plus tard.
 * Une reconnexion avant cette date le réactive (écran 4 « Bon retour »).
 */
export async function programmerSuppression(id: string): Promise<string> {
  const date = new Date(Date.now() + DELAI_SUPPRESSION_JOURS * 24 * 3600 * 1000).toISOString()
  verifierUn(
    await supabase()
      .from('utilisateurs')
      .update({ suppression_prevue_le: date })
      .eq('id', id)
      .is('supprime_le', null)
      .select('id')
      .maybeSingle(),
    'programmation de la suppression',
    'Compte introuvable',
  )
  return date
}

export async function annulerSuppression(id: string): Promise<void> {
  verifierUn(
    await supabase()
      .from('utilisateurs')
      .update({ suppression_prevue_le: null, derniere_reactivation_le: new Date().toISOString() })
      .eq('id', id)
      .is('supprime_le', null)
      .select('id')
      .maybeSingle(),
    'réactivation du compte',
    'Compte introuvable',
  )
}

/** Comptes dont la date de suppression est passée : à purger. */
export async function listerSuppressionsEchues(): Promise<Utilisateur[]> {
  const rows = verifier(
    await supabase()
      .from('utilisateurs')
      .select('*')
      .is('supprime_le', null)
      .not('suppression_prevue_le', 'is', null)
      .lte('suppression_prevue_le', new Date().toISOString()),
    'suppressions échues',
  )
  return rows.map(versUtilisateur)
}

/** Comptes dont la suppression tombe dans trois jours : rappel par e-mail. */
export async function listerSuppressionsJ3(): Promise<Utilisateur[]> {
  const debut = new Date(Date.now() + 3 * 24 * 3600 * 1000)
  const fin = new Date(debut.getTime() + 24 * 3600 * 1000)
  const rows = verifier(
    await supabase()
      .from('utilisateurs')
      .select('*')
      .is('supprime_le', null)
      .gte('suppression_prevue_le', debut.toISOString())
      .lt('suppression_prevue_le', fin.toISOString()),
    'rappels de suppression',
  )
  return rows.map(versUtilisateur)
}

export async function marquerSupprime(id: string): Promise<void> {
  // Le chemin est relu avant l'anonymisation, qui l'efface de la ligne.
  const photo = await cheminPhoto(id)
  verifierUn(
    await supabase()
      .from('utilisateurs')
      .update({
        supprime_le: new Date().toISOString(),
        suppression_prevue_le: null,
        mot_de_passe_hache: null,
        email: `supprime-${id}@compte-supprime.invalid`,
        whatsapp: null,
        photo: null,
      })
      .eq('id', id)
      .is('supprime_le', null)
      .select('id')
      .maybeSingle(),
    'suppression du compte',
    'Compte introuvable',
  )
  // Donnée personnelle : le portrait part avec l'e-mail et le numéro.
  await effacerObjetPhoto(photo)
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
/**
 * Enregistre la fiche apprenant et recalcule sa complétion. `fiche_completee`
 * reste la source de vérité de `reserver_place_session` (EM403) : il vaut
 * vrai seulement à 100 %, comme le verrou de la planche B.
 */
export async function majPersona(
  utilisateurId: string,
  persona: Persona,
  programme: ProgrammeSlug | null = null,
): Promise<{ persona: Persona; completion: number }> {
  const texte = (v?: string) => v?.trim() || null
  const row = verifier(
    await supabase()
      .from('personas')
      .upsert(
        {
          utilisateur_id: utilisateurId,
          age: persona.age ?? null,
          ville: texte(persona.ville),
          secteur: texte(persona.secteur),
          niveau: texte(persona.niveau),
          experience: texte(persona.experience),
          objectif: texte(persona.objectif),
          entreprise: texte(persona.entreprise),
          stade: texte(persona.stade),
          taille_equipe: texte(persona.tailleEquipe),
          canaux: texte(persona.canaux),
          presence_en_ligne: texte(persona.presenceEnLigne),
          budget: texte(persona.budget),
          defi: texte(persona.defi),
          reseaux: texte(persona.reseaux),
          audience: texte(persona.audience),
          outils: texte(persona.outils),
          clients: texte(persona.clients),
        },
        { onConflict: 'utilisateur_id' },
      )
      .select('*')
      .single(),
    'fiche apprenant',
  )
  const resultat = versPersona(row)
  const pourcentage = await reporterCompletion(utilisateurId, resultat, programme)
  return { persona: resultat, completion: pourcentage }
}

/**
 * Programme qui gouverne le bloc persona du profil : celui du premier module
 * possédé. Sans module, seuls les champs communs comptent.
 */
export async function programmeDeReference(utilisateurId: string): Promise<ProgrammeSlug | null> {
  const acces = verifier(
    await supabase()
      .from('acces')
      .select('module_id')
      .eq('utilisateur_id', utilisateurId)
      .is('revoque_le', null)
      .order('achete_le')
      .limit(1),
    'accès de l’apprenant',
  )
  const moduleId = acces[0]?.module_id
  if (!moduleId) return null
  const module = verifierOptionnel(
    await supabase().from('modules').select('programme').eq('id', moduleId).maybeSingle(),
    'module',
  )
  return module?.programme ?? null
}

/** Complétion du profil d'un apprenant, calculée comme côté navigateur. */
export async function completionProfil(utilisateur: Utilisateur): Promise<number> {
  if (utilisateur.role !== 'apprenant') return 100
  const [persona, programme] = await Promise.all([
    trouverPersona(utilisateur.id),
    programmeDeReference(utilisateur.id),
  ])
  return calculerCompletionProfil(utilisateur, persona, programme).pourcentage
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

/** Échecs de connexion des quinze dernières minutes pour une adresse
 *  (« Il vous reste N tentatives avant verrouillage temporaire »). */
export async function compterEchecsRecents(email: string): Promise<number> {
  const { data, error } = await supabase().rpc('compter_echecs_connexion', { p_email: email })
  if (error) throw traduireErreur(error, 'échecs de connexion')
  return Number(data ?? 0)
}

export async function definirMotDePasse(utilisateurId: string, hache: string): Promise<void> {
  verifier(
    await supabase()
      .from('utilisateurs')
      // Un changement de mot de passe lève aussi le verrouillage en cours et
      // date la dernière modification (planche B, écran 11).
      .update({ mot_de_passe_hache: hache, verrouille_jusqu_a: null, mot_de_passe_maj_le: new Date().toISOString() })
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

/** Accès à un module donné, pour la liste des inscrits d'un module côté
 *  formateur (planche D, écran 03 : « Cliquer un module ouvre le détail »). */
export async function listerAccesModule(moduleId: string): Promise<Acces[]> {
  const rows = verifier(
    await supabase().from('acces').select('*').eq('module_id', moduleId).order('achete_le'),
    'accès du module',
  )
  return rows.map(versAcces)
}

/**
 * Nombre d'apprenants ayant terminé chaque chapitre d'un module, en une
 * requête plutôt qu'un relevé par inscrit. Un chapitre sans durée connue ne
 * peut pas être déclaré vu : il compte zéro plutôt qu'un chiffre inventé.
 */
export async function avancementChapitresModule(
  moduleId: string,
): Promise<{ position: number; libelle: string; titre: string; vuPar: number }[]> {
  const chapitres = verifier(
    await supabase()
      .from('chapitres')
      .select('id, position, libelle, titre, video_duree_secondes, duree_minutes')
      .eq('module_id', moduleId)
      .order('position'),
    'chapitres du module',
  )
  if (!chapitres.length) return []

  const vus = verifier(
    await supabase()
      .from('visionnages')
      .select('chapitre_id, secondes_vues')
      .in('chapitre_id', chapitres.map((c) => c.id)),
    'visionnages du module',
  )

  return chapitres.map((c) => {
    const duree = c.video_duree_secondes ?? (c.duree_minutes ?? 0) * 60
    return {
      position: c.position,
      libelle: c.libelle,
      titre: c.titre,
      vuPar:
        duree > 0
          ? vus.filter((v) => v.chapitre_id === c.id && v.secondes_vues >= duree * 0.95).length
          : 0,
    }
  })
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

// --- Visionnages (planche B, écrans 01, 02 et 09) ---------------------------

export interface VisionnageChapitre {
  position: number
  secondesVues: number
  /** Chapitre vu en entier (durée mesurée atteinte à 95 %). */
  vu: boolean
}

/** Temps vu par chapitre d'un module, pour « 2 / 3 chapitres vus » et « reprise à 24:12 ». */
export async function listerVisionnagesModule(
  utilisateurId: string,
  moduleId: string,
): Promise<VisionnageChapitre[]> {
  const chapitres = verifier(
    await supabase()
      .from('chapitres')
      .select('id, position, video_duree_secondes, duree_minutes')
      .eq('module_id', moduleId)
      .order('position'),
    'chapitres',
  )
  if (!chapitres.length) return []
  const vus = verifier(
    await supabase()
      .from('visionnages')
      .select('chapitre_id, secondes_vues')
      .eq('utilisateur_id', utilisateurId)
      .in('chapitre_id', chapitres.map((c) => c.id)),
    'visionnages',
  )
  return chapitres.map((c) => {
    const secondesVues = vus.find((v) => v.chapitre_id === c.id)?.secondes_vues ?? 0
    const duree = c.video_duree_secondes ?? (c.duree_minutes ?? 0) * 60
    return { position: c.position, secondesVues, vu: duree > 0 && secondesVues >= duree * 0.95 }
  })
}

/** Même relevé pour tous les modules de l'apprenant, en une passe. */
export async function listerVisionnagesUtilisateur(
  utilisateurId: string,
): Promise<Map<string, VisionnageChapitre[]>> {
  const chapitres = verifier(
    await supabase().from('chapitres').select('id, module_id, position, video_duree_secondes, duree_minutes'),
    'chapitres',
  )
  const vus = verifier(
    await supabase().from('visionnages').select('chapitre_id, secondes_vues').eq('utilisateur_id', utilisateurId),
    'visionnages',
  )
  const parModule = new Map<string, VisionnageChapitre[]>()
  for (const c of [...chapitres].sort((a, b) => a.position - b.position)) {
    const secondesVues = vus.find((v) => v.chapitre_id === c.id)?.secondes_vues ?? 0
    const duree = c.video_duree_secondes ?? (c.duree_minutes ?? 0) * 60
    const liste = parModule.get(c.module_id) ?? []
    liste.push({ position: c.position, secondesVues, vu: duree > 0 && secondesVues >= duree * 0.95 })
    parModule.set(c.module_id, liste)
  }
  return parModule
}

/** Confirme l'identité portée par un certificat (planche B, écran 05). */
export async function confirmerIdentiteCertificat(utilisateurId: string, moduleId: string): Promise<void> {
  verifier(
    await supabase()
      .from('certificats')
      .update({ prenom_nom_confirme_le: new Date().toISOString() })
      .eq('utilisateur_id', utilisateurId)
      .eq('module_id', moduleId)
      .select('numero'),
    'confirmation du certificat',
  )
}
