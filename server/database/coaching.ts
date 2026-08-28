import type {
  DemandeCoachingPrive,
  InscriptionSession,
  NoteFormateur,
  SessionCoaching,
  SujetSession,
} from '#shared/types'
import { supabase } from './client'
import { traduireErreur, verifier, verifierOptionnel, verifierUn } from './erreurs'
import {
  versDemandeCoachingPrive,
  versInscriptionSession,
  versNoteFormateur,
  versSessionCoaching,
  versSujetSession,
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

// --- Coaching privé --------------------------------------------------------

export async function listerDemandesCoachingPrive(): Promise<DemandeCoachingPrive[]> {
  const rows = verifier(
    await supabase().from('demandes_coaching_prive').select('*').order('recue_le', { ascending: false }),
    'demandes de coaching privé',
  )
  return rows.map(versDemandeCoachingPrive)
}
