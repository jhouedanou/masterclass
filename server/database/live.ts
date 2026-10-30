import type {
  EtapeDeroule,
  InscriptionLive,
  SessionLive,
  StatutSessionLive,
  VisibiliteLive,
} from '#shared/types'
import { supabase } from './client'
import { traduireErreur, verifier, verifierOptionnel } from './erreurs'
import type { Database, InscriptionLiveRow, SessionLiveRow } from './types'

/**
 * Live Sessions (CDC v1.3) : sessions, inscriptions et réglage de visibilité.
 *
 * Les champs Zoom ne sortent de ce fichier que par `liensZoomLive`, et le
 * chemin du support que par `supportLive` : aucune projection de session ne
 * les porte, pour qu'une route qui renvoie une session ne puisse pas les
 * publier par mégarde (RM4, T7).
 */

type MajSessionLive = Database['public']['Tables']['sessions_live']['Update']
type ChampEnvoiInscription = 'envoye_j1_le' | 'envoye_m10_le' | 'envoye_h0_le' | 'envoye_fin_le' | 'envoye_video_le'
type ChampEnvoiSession = 'envoye_formateur_planifiee_le' | 'envoye_formateur_j1_le'

/** Colonnes lues pour une session, sans les champs confidentiels. */
const COLONNES_SESSION =
  'id, module_id, slug, debut, duree_minutes, capacite, formateur_id, moderateur_id, prerequis, gains, deroule, deroule_valide_le, test_technique_le, statut, support_nom, zoom_reunion_id, publiee_le, termine_le, annule_le, video_publiee_le, envoye_formateur_planifiee_le, envoye_formateur_j1_le, cree_le, maj_le'

type LigneSession = Omit<SessionLiveRow, 'zoom_mot_de_passe' | 'zoom_lien_participation' | 'zoom_lien_hote' | 'support_chemin'>

function versSessionLive(row: LigneSession): SessionLive {
  return {
    id: row.id,
    moduleId: row.module_id,
    slug: row.slug,
    debut: new Date(row.debut).toISOString(),
    dureeMinutes: row.duree_minutes,
    capacite: row.capacite,
    formateurId: row.formateur_id,
    moderateurId: row.moderateur_id,
    prerequis: Array.isArray(row.prerequis) ? row.prerequis : [],
    gains: Array.isArray(row.gains) ? row.gains : [],
    deroule: Array.isArray(row.deroule) ? (row.deroule as EtapeDeroule[]) : [],
    derouleValideLe: row.deroule_valide_le,
    testTechniqueLe: row.test_technique_le,
    statut: row.statut,
    supportNom: row.support_nom,
    aReunionZoom: Boolean(row.zoom_reunion_id),
    publieeLe: row.publiee_le,
    termineLe: row.termine_le,
    annuleLe: row.annule_le,
    videoPublieeLe: row.video_publiee_le,
    creeLe: row.cree_le,
  }
}

function versInscriptionLive(row: InscriptionLiveRow): InscriptionLive {
  return {
    id: row.id,
    sessionLiveId: row.session_live_id,
    utilisateurId: row.utilisateur_id,
    commandeReference: row.commande_reference,
    statut: row.statut,
    reservationExpireLe: row.reservation_expire_le,
    confirmeLe: row.confirme_le,
    creeLe: row.cree_le,
  }
}

// --- Sessions ---------------------------------------------------------------

export async function listerSessionsLive(filtre: {
  statuts?: StatutSessionLive[]
  formateurId?: string
  moduleId?: string
} = {}): Promise<SessionLive[]> {
  let requete = supabase().from('sessions_live').select(COLONNES_SESSION).order('debut', { ascending: true })
  if (filtre.statuts?.length) requete = requete.in('statut', filtre.statuts)
  if (filtre.formateurId) requete = requete.eq('formateur_id', filtre.formateurId)
  if (filtre.moduleId) requete = requete.eq('module_id', filtre.moduleId)
  const rows = verifier(await requete, 'Live Sessions') as unknown as LigneSession[]
  return rows.map(versSessionLive)
}

export async function trouverSessionLive(id: string): Promise<SessionLive | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const row = verifierOptionnel(
    await supabase().from('sessions_live').select(COLONNES_SESSION).eq('id', id).maybeSingle(),
    'Live Session',
  ) as unknown as LigneSession | null
  return row ? versSessionLive(row) : null
}

export async function trouverSessionLiveParSlug(slug: string): Promise<SessionLive | null> {
  const row = verifierOptionnel(
    await supabase().from('sessions_live').select(COLONNES_SESSION).eq('slug', slug).maybeSingle(),
    'Live Session',
  ) as unknown as LigneSession | null
  return row ? versSessionLive(row) : null
}

/** Slug libre dérivé de celui du module : `slug-du-module-2026-11-06`, suffixé au besoin. */
export async function slugLibre(base: string): Promise<string> {
  const { data } = await supabase().from('sessions_live').select('slug').like('slug', `${base}%`)
  const pris = new Set((data ?? []).map((r) => r.slug))
  if (!pris.has(base)) return base
  for (let n = 2; ; n++) if (!pris.has(`${base}-${n}`)) return `${base}-${n}`
}

export async function creerSessionLive(champs: {
  moduleId: string
  slug: string
  debut: string
  dureeMinutes: number
  capacite: number
  formateurId: string
  moderateurId: string | null
  prerequis: string[]
  gains: string[]
  deroule: EtapeDeroule[]
  zoom?: { reunionId: string | null; motDePasse: string | null; lienParticipation: string | null; lienHote: string | null }
}): Promise<SessionLive> {
  const row = verifier(
    await supabase()
      .from('sessions_live')
      .insert({
        module_id: champs.moduleId,
        slug: champs.slug,
        debut: champs.debut,
        duree_minutes: champs.dureeMinutes,
        capacite: champs.capacite,
        formateur_id: champs.formateurId,
        moderateur_id: champs.moderateurId,
        prerequis: champs.prerequis,
        gains: champs.gains,
        deroule: champs.deroule,
        zoom_reunion_id: champs.zoom?.reunionId ?? null,
        zoom_mot_de_passe: champs.zoom?.motDePasse ?? null,
        zoom_lien_participation: champs.zoom?.lienParticipation ?? null,
        zoom_lien_hote: champs.zoom?.lienHote ?? null,
      })
      .select(COLONNES_SESSION)
      .single(),
    'création de la Live Session',
  ) as unknown as LigneSession
  return versSessionLive(row)
}

/** Mise à jour libre, colonnes de la table (back-office et job). */
export async function majSessionLive(id: string, colonnes: MajSessionLive): Promise<SessionLive> {
  const row = verifier(
    await supabase().from('sessions_live').update(colonnes).eq('id', id).select(COLONNES_SESSION).single(),
    'mise à jour de la Live Session',
  ) as unknown as LigneSession
  return versSessionLive(row)
}

/**
 * Change le statut seulement depuis l'un des statuts attendus et dit si cet
 * appel a fait la transition. Le job et l'admin peuvent agir en même temps :
 * un seul des deux envoie les e-mails qui en découlent.
 */
export async function transitionnerSessionLive(
  id: string,
  depuis: StatutSessionLive[],
  vers: StatutSessionLive,
  colonnes: MajSessionLive = {},
): Promise<boolean> {
  const rows = verifier(
    await supabase()
      .from('sessions_live')
      .update({ ...colonnes, statut: vers })
      .eq('id', id)
      .in('statut', depuis)
      .select('id'),
    'statut de la Live Session',
  )
  return rows.length > 0
}

export async function supprimerSessionLive(id: string): Promise<void> {
  const { error } = await supabase().from('sessions_live').delete().eq('id', id)
  if (error) throw traduireErreur(error, 'suppression de la Live Session')
}

/** Réunion Zoom d'une session : formateur, admins et salle intégrée seulement (RM4). */
export async function liensZoomLive(id: string): Promise<{
  reunionId: string | null
  motDePasse: string | null
  lienParticipation: string | null
  lienHote: string | null
}> {
  const row = verifierOptionnel(
    await supabase()
      .from('sessions_live')
      .select('zoom_reunion_id, zoom_mot_de_passe, zoom_lien_participation, zoom_lien_hote')
      .eq('id', id)
      .maybeSingle(),
    'réunion de la Live Session',
  )
  return {
    reunionId: row?.zoom_reunion_id ?? null,
    motDePasse: row?.zoom_mot_de_passe ?? null,
    lienParticipation: row?.zoom_lien_participation ?? null,
    lienHote: row?.zoom_lien_hote ?? null,
  }
}

export async function majZoomLive(
  id: string,
  zoom: { reunionId: string | null; motDePasse: string | null; lienParticipation: string | null; lienHote: string | null },
): Promise<void> {
  const { error } = await supabase()
    .from('sessions_live')
    .update({
      zoom_reunion_id: zoom.reunionId,
      zoom_mot_de_passe: zoom.motDePasse,
      zoom_lien_participation: zoom.lienParticipation,
      zoom_lien_hote: zoom.lienHote,
    })
    .eq('id', id)
  if (error) throw traduireErreur(error, 'réunion de la Live Session')
}

/** Chemin du support dans le seau privé, pour signer une URL de lecture (RM5). */
export async function supportLive(id: string): Promise<{ chemin: string; nom: string } | null> {
  const row = verifierOptionnel(
    await supabase().from('sessions_live').select('support_chemin, support_nom').eq('id', id).maybeSingle(),
    'support de la Live Session',
  )
  return row?.support_chemin ? { chemin: row.support_chemin, nom: row.support_nom ?? 'Support de cours' } : null
}

export async function majSupportLive(id: string, chemin: string | null, nom: string | null): Promise<void> {
  const { error } = await supabase()
    .from('sessions_live')
    .update({ support_chemin: chemin, support_nom: nom })
    .eq('id', id)
  if (error) throw traduireErreur(error, 'support de la Live Session')
}

// --- Inscriptions -------------------------------------------------------------

/**
 * Places prises par session : confirmées, et réservations encore valables.
 * Réservé à l'administration (RM13) et au calcul de « Complet ».
 */
export async function compterPlacesLive(
  sessionIds: string[],
): Promise<Map<string, { confirmees: number; reservees: number }>> {
  const comptes = new Map<string, { confirmees: number; reservees: number }>()
  for (const id of sessionIds) comptes.set(id, { confirmees: 0, reservees: 0 })
  if (!sessionIds.length) return comptes
  const rows = verifier(
    await supabase()
      .from('inscriptions_live')
      .select('session_live_id, statut, reservation_expire_le')
      .in('session_live_id', sessionIds)
      .in('statut', ['confirmee', 'attente']),
    'places des Live Sessions',
  )
  const maintenant = Date.now()
  for (const r of rows) {
    const c = comptes.get(r.session_live_id)
    if (!c) continue
    if (r.statut === 'confirmee') c.confirmees++
    else if (r.reservation_expire_le && new Date(r.reservation_expire_le).getTime() > maintenant) c.reservees++
  }
  return comptes
}

/** Réserve une place 15 min avant paiement (fonction `reserver_place_live`). */
export async function reserverPlaceLive(champs: {
  sessionId: string
  utilisateurId: string
  commandeReference: string
  attribution: Record<string, string>
}): Promise<InscriptionLive> {
  const { data, error } = await supabase().rpc('reserver_place_live', {
    p_session_id: champs.sessionId,
    p_utilisateur_id: champs.utilisateurId,
    p_commande_reference: champs.commandeReference,
    p_attribution: champs.attribution,
  })
  if (error) throw traduireErreur(error, 'réservation de la Live Session')
  return versInscriptionLive(data as InscriptionLiveRow)
}

/** Confirme l'inscription réglée par une commande et ouvre l'accès au module. */
export async function confirmerInscriptionLive(commandeReference: string): Promise<{
  inscriptionId: string
  sessionId: string
  statut: InscriptionLive['statut']
  premiereConfirmation: boolean
}> {
  const { data, error } = await supabase().rpc('confirmer_inscription_live', {
    p_commande_reference: commandeReference,
  })
  if (error) throw traduireErreur(error, 'confirmation de l’inscription')
  const r = data as { inscription_id: string; session_id: string; statut: InscriptionLive['statut']; premiere_confirmation: boolean }
  return {
    inscriptionId: r.inscription_id,
    sessionId: r.session_id,
    statut: r.statut,
    premiereConfirmation: r.premiere_confirmation,
  }
}

export async function trouverInscriptionLive(sessionId: string, utilisateurId: string): Promise<InscriptionLive | null> {
  const row = verifierOptionnel(
    await supabase()
      .from('inscriptions_live')
      .select('*')
      .eq('session_live_id', sessionId)
      .eq('utilisateur_id', utilisateurId)
      .maybeSingle(),
    'inscription à la Live Session',
  )
  return row ? versInscriptionLive(row) : null
}

export async function trouverInscriptionLiveParId(id: string): Promise<InscriptionLive | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const row = verifierOptionnel(
    await supabase().from('inscriptions_live').select('*').eq('id', id).maybeSingle(),
    'inscription à la Live Session',
  )
  return row ? versInscriptionLive(row) : null
}

export async function trouverInscriptionLiveParCommande(reference: string): Promise<InscriptionLive | null> {
  const row = verifierOptionnel(
    await supabase().from('inscriptions_live').select('*').eq('commande_reference', reference).maybeSingle(),
    'inscription à la Live Session',
  )
  return row ? versInscriptionLive(row) : null
}

/** Inscriptions d'un apprenant, toutes sessions et tous statuts. */
export async function listerInscriptionsLiveUtilisateur(utilisateurId: string): Promise<InscriptionLive[]> {
  const rows = verifier(
    await supabase()
      .from('inscriptions_live')
      .select('*')
      .eq('utilisateur_id', utilisateurId)
      .order('cree_le', { ascending: false }),
    'inscriptions aux Live Sessions',
  )
  return rows.map(versInscriptionLive)
}

/** Inscriptions d'une session, filtrées par statut (confirmées par défaut). */
export async function listerInscriptionsSessionLive(
  sessionId: string,
  statuts: InscriptionLive['statut'][] = ['confirmee'],
): Promise<(InscriptionLive & { envois: Record<ChampEnvoiInscription, string | null> })[]> {
  const rows = verifier(
    await supabase()
      .from('inscriptions_live')
      .select('*')
      .eq('session_live_id', sessionId)
      .in('statut', statuts)
      .order('confirme_le', { ascending: true }),
    'inscrits à la Live Session',
  )
  return rows.map((r) => ({
    ...versInscriptionLive(r),
    envois: {
      envoye_j1_le: r.envoye_j1_le,
      envoye_m10_le: r.envoye_m10_le,
      envoye_h0_le: r.envoye_h0_le,
      envoye_fin_le: r.envoye_fin_le,
      envoye_video_le: r.envoye_video_le,
    },
  }))
}

/**
 * Pose l'horodatage d'un envoi s'il ne l'est pas encore, et dit si cet appel
 * l'a posé : seul celui-là envoie. Un job relancé ou concurrent n'envoie donc
 * rien deux fois (§7). `annulerEnvoi` le retire si l'envoi échoue, pour qu'il
 * soit retenté au passage suivant.
 */
export async function reserverEnvoi(inscriptionId: string, champ: ChampEnvoiInscription): Promise<boolean> {
  const rows = verifier(
    await supabase()
      .from('inscriptions_live')
      .update({ [champ]: new Date().toISOString() } as Partial<InscriptionLiveRow>)
      .eq('id', inscriptionId)
      .is(champ, null)
      .select('id'),
    'envoi de la Live Session',
  )
  return rows.length > 0
}

export async function annulerEnvoi(inscriptionId: string, champ: ChampEnvoiInscription): Promise<void> {
  await supabase().from('inscriptions_live').update({ [champ]: null } as Partial<InscriptionLiveRow>).eq('id', inscriptionId)
}

/** Marque des envois comme faits sans envoyer : envois passés d'une inscription tardive (§11). */
export async function marquerEnvoisPasses(inscriptionId: string, champs: ChampEnvoiInscription[]): Promise<void> {
  if (!champs.length) return
  const maintenant = new Date().toISOString()
  await supabase()
    .from('inscriptions_live')
    .update(Object.fromEntries(champs.map((c) => [c, maintenant])) as Partial<InscriptionLiveRow>)
    .eq('id', inscriptionId)
}

export async function reserverEnvoiSession(sessionId: string, champ: ChampEnvoiSession): Promise<boolean> {
  const rows = verifier(
    await supabase()
      .from('sessions_live')
      .update({ [champ]: new Date().toISOString() } as Partial<SessionLiveRow>)
      .eq('id', sessionId)
      .is(champ, null)
      .select('id'),
    'envoi de la Live Session',
  )
  return rows.length > 0
}

/** Changement d'horaire (§4.1) : les rappels repartent de zéro. */
export async function reinitialiserRelancesLive(sessionId: string): Promise<void> {
  const { error } = await supabase()
    .from('inscriptions_live')
    .update({ envoye_j1_le: null, envoye_m10_le: null, envoye_h0_le: null })
    .eq('session_live_id', sessionId)
  if (error) throw traduireErreur(error, 'relances de la Live Session')
  await supabase().from('sessions_live').update({ envoye_formateur_j1_le: null }).eq('id', sessionId)
}

/** Réservations échues : la place est libérée (§6, étape 4). */
export async function expirerReservationsLive(): Promise<number> {
  const rows = verifier(
    await supabase()
      .from('inscriptions_live')
      .update({ statut: 'expiree' })
      .eq('statut', 'attente')
      .lt('reservation_expire_le', new Date().toISOString())
      .select('id'),
    'expiration des réservations',
  )
  return rows.length
}

/** Annulation d'une session : les inscriptions en attente tombent avec elle. */
export async function annulerReservationsSessionLive(sessionId: string): Promise<void> {
  const { error } = await supabase()
    .from('inscriptions_live')
    .update({ statut: 'annulee' })
    .eq('session_live_id', sessionId)
    .eq('statut', 'attente')
  if (error) throw traduireErreur(error, 'annulation des réservations')
}

export async function liveTermineePour(utilisateurId: string, moduleId: string): Promise<boolean> {
  const { data, error } = await supabase().rpc('live_terminee_pour', {
    p_utilisateur_id: utilisateurId,
    p_module_id: moduleId,
  })
  if (error) throw traduireErreur(error, 'Live Session terminée')
  return Boolean(data)
}

// --- Réglage de visibilité (10.G) -------------------------------------------

export async function lireVisibiliteLive(): Promise<VisibiliteLive> {
  const row = verifierOptionnel(
    await supabase().from('reglages_live').select('visibilite').eq('id', true).maybeSingle(),
    'réglage Live Sessions',
  )
  return row?.visibilite ?? 'personne'
}

export async function majVisibiliteLive(visibilite: VisibiliteLive, auteur: string): Promise<void> {
  const { error } = await supabase()
    .from('reglages_live')
    .upsert({ id: true, visibilite, maj_par: auteur })
  if (error) throw traduireErreur(error, 'réglage Live Sessions')
}

/** Provenance publicitaire recopiée sur l'inscription (10.B). */
export async function attributionInscriptionLive(id: string): Promise<{
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  fbclid: string | null
  ttclid: string | null
  liFatId: string | null
} | null> {
  const row = verifierOptionnel(
    await supabase()
      .from('inscriptions_live')
      .select('utm_source, utm_medium, utm_campaign, fbclid, ttclid, li_fat_id')
      .eq('id', id)
      .maybeSingle(),
    'provenance de l’inscription',
  )
  return row
    ? {
        utmSource: row.utm_source,
        utmMedium: row.utm_medium,
        utmCampaign: row.utm_campaign,
        fbclid: row.fbclid,
        ttclid: row.ttclid,
        liFatId: row.li_fat_id,
      }
    : null
}

/** Début de session (§4.1) : les réservations en cours sur cette session expirent. */
export async function expirerReservationsSessionLive(sessionId: string): Promise<void> {
  const { error } = await supabase()
    .from('inscriptions_live')
    .update({ statut: 'expiree' })
    .eq('session_live_id', sessionId)
    .eq('statut', 'attente')
  if (error) throw traduireErreur(error, 'expiration des réservations')
}

/** Référence FeexPay (sinon la nôtre) des transactions de ces commandes, pour l'export des inscrits. */
export async function referencesTransactionsLive(commandes: string[]): Promise<Map<string, string>> {
  const references = new Map<string, string>()
  if (!commandes.length) return references
  const rows = verifier(
    await supabase()
      .from('transactions')
      .select('reference, reference_prestataire, commande_reference, statut')
      .in('commande_reference', commandes),
    'transactions des inscriptions',
  )
  for (const r of rows) {
    if (!r.commande_reference) continue
    if (r.statut === 'reussie' || !references.has(r.commande_reference)) {
      references.set(r.commande_reference, r.reference_prestataire ?? r.reference)
    }
  }
  return references
}
