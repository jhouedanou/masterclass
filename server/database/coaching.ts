import type {
  CreneauCoaching,
  DemandeCoachingPrive,
  HistoriqueCoachingPrive,
  InscriptionSession,
  NoteFormateur,
  SessionCoaching,
  StatutCoachingPrive,
  SujetSession,
  Utilisateur,
} from '#shared/types'
import { supabase } from './client'
import { traduireErreur, verifier, verifierOptionnel, verifierUn } from './erreurs'
import {
  versDemandeCoachingPrive,
  versHistoriqueCoachingPrive,
  versInscriptionSession,
  versNoteFormateur,
  versSessionCoaching,
  versSujetSession,
  versUtilisateur,
} from './mappers'
import type { ProgrammeSlugSql } from './types'

/** Coaching collectif et privé : sessions, inscriptions, sujets, notes. */

// --- Sessions --------------------------------------------------------------

export async function listerSessions(): Promise<SessionCoaching[]> {
  const rows = verifier(
    await supabase().from('sessions_coaching').select('*').order('date_seance').order('heure'),
    'sessions',
  )
  return rows.map(versSessionCoaching)
}

export async function trouverSession(id: string): Promise<SessionCoaching | null> {
  const row = verifierOptionnel(
    await supabase().from('sessions_coaching').select('*').eq('id', id).maybeSingle(),
    'session',
  )
  return row ? versSessionCoaching(row) : null
}

export async function creerSession(champs: {
  thematiqueId: string
  programme: ProgrammeSlugSql
  formateurId: string
  date: string
  heure: string
  dureeMinutes?: number
  places?: number
}): Promise<SessionCoaching> {
  const { data, error } = await supabase()
    .from('sessions_coaching')
    .insert({
      thematique_id: champs.thematiqueId,
      programme: champs.programme,
      formateur_id: champs.formateurId,
      date_seance: champs.date,
      heure: champs.heure,
      duree_minutes: champs.dureeMinutes ?? 120,
      places: champs.places ?? 25,
    })
    .select('*')
    .single()

  // L'index unique partiel porte la règle « une seule session par thématique et
  // par date, annulations exclues » ; on lui rend son message d'origine.
  if (error?.code === '23505') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Une session existe déjà pour cette thématique à cette date',
    })
  }
  if (error) throw traduireErreur(error, 'création de session')

  return versSessionCoaching(data)
}

export async function annulerSession(id: string): Promise<SessionCoaching> {
  const row = verifierUn(
    await supabase()
      .from('sessions_coaching')
      .update({ statut: 'annulee' })
      .eq('id', id)
      .select('*')
      .maybeSingle(),
    'annulation de session',
    'Session introuvable',
  )
  return versSessionCoaching(row)
}

export async function reporterSession(
  id: string,
  quand: { date?: string; heure?: string },
): Promise<SessionCoaching> {
  const champs: { date_seance?: string; heure?: string } = {}
  if (quand.date) champs.date_seance = quand.date
  if (quand.heure) champs.heure = quand.heure

  const row = verifierUn(
    await supabase().from('sessions_coaching').update(champs).eq('id', id).select('*').maybeSingle(),
    'report de session',
    'Session introuvable',
  )
  return versSessionCoaching(row)
}

/**
 * Relevé de présence après la séance. Il ne peut pas dépasser le nombre
 * d'inscrits — la contrainte `session_presents_coherent` le refuse aussi côté
 * base. Marque la séance comme terminée : une séance dont on relève la
 * présence a forcément eu lieu.
 */
export async function releverPresence(
  id: string,
  presents: number | null,
): Promise<SessionCoaching> {
  const row = verifierUn(
    await supabase()
      .from('sessions_coaching')
      .update({ presents, statut: presents === null ? 'planifiee' : 'terminee' })
      .eq('id', id)
      .select('*')
      .maybeSingle(),
    'relevé de présence',
    'Session introuvable',
  )
  return versSessionCoaching(row)
}

// --- Inscriptions et sujets ------------------------------------------------

export async function listerInscriptionsUtilisateur(
  utilisateurId: string,
): Promise<InscriptionSession[]> {
  const rows = verifier(
    await supabase().from('inscriptions_sessions').select('*').eq('utilisateur_id', utilisateurId),
    'inscriptions',
  )
  return rows.map(versInscriptionSession)
}

/** Comptes inscrits à une session, pour les prévenir d'une annulation ou
 *  d'un report. */
export async function listerInscritsSession(sessionId: string): Promise<Utilisateur[]> {
  const inscriptions = verifier(
    await supabase().from('inscriptions_sessions').select('utilisateur_id').eq('session_id', sessionId),
    'inscrits de la session',
  )
  const ids = inscriptions.map((i) => i.utilisateur_id)
  if (!ids.length) return []
  const rows = verifier(
    await supabase().from('utilisateurs').select('*').in('id', ids).is('supprime_le', null),
    'comptes inscrits',
  )
  return rows.map(versUtilisateur)
}

export async function listerSujetsSession(sessionId: string): Promise<SujetSession[]> {
  const rows = verifier(
    await supabase().from('sujets_sessions').select('*').eq('session_id', sessionId).order('soumis_le'),
    'sujets de session',
  )
  return rows.map(versSujetSession)
}

/**
 * Réservation d'une place. Les six vérifications (session ouverte, fiche
 * complète, module de la thématique acquis, non déjà inscrit, places
 * restantes, réponses fournies) sont portées par la fonction Postgres, qui
 * verrouille la session le temps de l'opération.
 */
export async function reserverPlace(demande: {
  sessionId: string
  utilisateurId: string
  preoccupation: string
  attente: string
  apprenant: string
}): Promise<number> {
  const { data, error } = await supabase().rpc('reserver_place_session', {
    p_session_id: demande.sessionId,
    p_utilisateur_id: demande.utilisateurId,
    p_preoccupation: demande.preoccupation,
    p_attente: demande.attente,
    p_apprenant: demande.apprenant,
  })
  if (error) throw traduireErreur(error, 'réservation de session')
  return data
}

// --- Notes des apprenants --------------------------------------------------

export async function listerNotesFormateur(formateurId: string): Promise<NoteFormateur[]> {
  const rows = verifier(
    await supabase()
      .from('notes_formateurs')
      .select('*')
      .eq('formateur_id', formateurId)
      .order('cree_le'),
    'notes du formateur',
  )
  return rows.map(versNoteFormateur)
}

export async function creerNote(champs: {
  formateurId: string
  utilisateurId: string
  origine: 'collective' | 'privee'
  note: number
  commentaire?: string
}): Promise<NoteFormateur> {
  const row = verifier(
    await supabase()
      .from('notes_formateurs')
      .insert({
        formateur_id: champs.formateurId,
        utilisateur_id: champs.utilisateurId,
        origine: champs.origine,
        note: champs.note,
        commentaire: champs.commentaire?.trim() || null,
      })
      .select('*')
      .single(),
    'enregistrement de la note',
  )
  return versNoteFormateur(row)
}

/** Notes déposées par un apprenant — pour savoir s'il a déjà noté une séance. */
export async function listerNotesUtilisateur(utilisateurId: string): Promise<NoteFormateur[]> {
  const rows = verifier(
    await supabase().from('notes_formateurs').select('*').eq('utilisateur_id', utilisateurId).order('cree_le'),
    'notes de l’apprenant',
  )
  return rows.map(versNoteFormateur)
}

// --- Coaching privé --------------------------------------------------------
//
// Parcours 03 de la planche E : l'apprenant choisit un formateur dont le
// coaching privé est activé et propose des créneaux (B-06) ; l'équipe traite,
// encaisse et planifie (C-05) ; le formateur anime (D-05) ; l'apprenant suit
// chaque étape datée et note la séance (B-10). Chaque changement de statut
// est écrit dans `historique_coaching_prive` par le dépôt, avec son auteur.

export async function listerDemandesCoachingPrive(): Promise<DemandeCoachingPrive[]> {
  const rows = verifier(
    await supabase().from('demandes_coaching_prive').select('*').order('recue_le', { ascending: false }),
    'demandes de coaching privé',
  )
  return rows.map(versDemandeCoachingPrive)
}

export async function listerDemandesCoachingPriveUtilisateur(
  utilisateurId: string,
): Promise<DemandeCoachingPrive[]> {
  const rows = verifier(
    await supabase()
      .from('demandes_coaching_prive')
      .select('*')
      .eq('utilisateur_id', utilisateurId)
      .order('recue_le', { ascending: false }),
    'demandes de coaching privé de l’apprenant',
  )
  return rows.map(versDemandeCoachingPrive)
}

export async function listerDemandesCoachingPriveFormateur(
  formateurId: string,
): Promise<DemandeCoachingPrive[]> {
  const rows = verifier(
    await supabase()
      .from('demandes_coaching_prive')
      .select('*')
      .eq('formateur_id', formateurId)
      .order('recue_le', { ascending: false }),
    'demandes de coaching privé du formateur',
  )
  return rows.map(versDemandeCoachingPrive)
}

export async function trouverDemandeCoachingPrive(id: string): Promise<DemandeCoachingPrive | null> {
  const row = verifierOptionnel(
    await supabase().from('demandes_coaching_prive').select('*').eq('id', id).maybeSingle(),
    'demande de coaching privé',
  )
  return row ? versDemandeCoachingPrive(row) : null
}

async function tracerHistorique(entree: {
  demandeId: string
  statut: StatutCoachingPrive
  auteur: string
  commentaire?: string
}): Promise<HistoriqueCoachingPrive> {
  const row = verifier(
    await supabase()
      .from('historique_coaching_prive')
      .insert({
        demande_id: entree.demandeId,
        statut: entree.statut,
        auteur: entree.auteur,
        commentaire: entree.commentaire?.trim() || null,
      })
      .select('*')
      .single(),
    'suivi de la demande',
  )
  return versHistoriqueCoachingPrive(row)
}

export async function creerDemandeCoachingPrive(champs: {
  utilisateurId: string
  apprenant: string
  moduleId: string
  formateurId: string
  besoins: string
  disponibilites: string
  creneaux: CreneauCoaching[]
  heures: number
}): Promise<DemandeCoachingPrive> {
  const row = verifier(
    await supabase()
      .from('demandes_coaching_prive')
      .insert({
        utilisateur_id: champs.utilisateurId,
        apprenant: champs.apprenant,
        module_id: champs.moduleId,
        formateur_id: champs.formateurId,
        besoins: champs.besoins,
        disponibilites: champs.disponibilites,
        creneaux: champs.creneaux,
        heures: champs.heures,
      })
      .select('*')
      .single(),
    'création de la demande de coaching privé',
  )
  await tracerHistorique({ demandeId: row.id, statut: 'en-attente', auteur: champs.apprenant })
  return versDemandeCoachingPrive(row)
}

/** Suivi daté de plusieurs demandes, du plus ancien au plus récent. */
export async function listerHistoriqueCoachingPrive(
  demandeIds: string[],
): Promise<HistoriqueCoachingPrive[]> {
  if (!demandeIds.length) return []
  const rows = verifier(
    await supabase()
      .from('historique_coaching_prive')
      .select('*')
      .in('demande_id', demandeIds)
      .order('cree_le'),
    'suivi des demandes',
  )
  return rows.map(versHistoriqueCoachingPrive)
}

/**
 * Changement de statut d'une demande, avec sa trace datée. Les transitions
 * autorisées sont vérifiées par l'API appelante ; ici on écrit ce qu'on
 * reçoit, en une mise à jour puis une ligne d'historique.
 */
export async function changerStatutDemandeCoachingPrive(
  id: string,
  changement: {
    statut: StatutCoachingPrive
    auteur: string
    commentaire?: string
    creneau?: string
    lienSession?: string
    motifRefus?: string
  },
): Promise<DemandeCoachingPrive> {
  const champs: {
    statut: StatutCoachingPrive
    creneau?: string
    creneau_retenu_le?: string
    lien_session?: string
    motif_refus?: string
  } = { statut: changement.statut }
  if (changement.creneau) {
    champs.creneau = changement.creneau
    champs.creneau_retenu_le = new Date().toISOString()
  }
  if (changement.lienSession !== undefined) champs.lien_session = changement.lienSession
  if (changement.motifRefus) champs.motif_refus = changement.motifRefus

  const row = verifierUn(
    await supabase().from('demandes_coaching_prive').update(champs).eq('id', id).select('*').maybeSingle(),
    'mise à jour de la demande',
    'Demande introuvable',
  )
  await tracerHistorique({
    demandeId: id,
    statut: changement.statut,
    auteur: changement.auteur,
    commentaire: changement.commentaire,
  })
  return versDemandeCoachingPrive(row)
}
