import type { LiveSession, Utilisateur } from '#shared/types'
import { supabase } from './client'
import { traduireErreur, verifier, verifierOptionnel } from './erreurs'
import { versUtilisateur } from './mappers'
import type { LiveSessionRow } from './types'

/**
 * Live Sessions (migration 48) : séances en direct ouvertes au public, avec
 * fiche, prix et inscription. Les liens Zoom ne sortent jamais de ce dépôt
 * par `LiveSession` : ils passent par `liensZoomLive`, lu par la salle et
 * l'e-mail de confirmation seulement.
 */

function versLiveSession(row: LiveSessionRow): LiveSession {
  return {
    id: row.id,
    slug: row.slug,
    titre: row.titre,
    resume: row.resume,
    description: row.description,
    prerequis: row.prerequis,
    objectifs: row.objectifs,
    formateurId: row.formateur_id,
    date: row.date_seance,
    heure: row.heure.slice(0, 5),
    dureeMinutes: row.duree_minutes,
    prixFcfa: row.prix_fcfa,
    places: row.places,
    inscrits: row.inscrits,
    statut: row.statut,
    image: row.image ?? undefined,
  }
}

/** Base où la migration 48 n'est pas encore passée : on fait comme s'il n'y avait aucune Live Session. */
const TABLE_ABSENTE = ['PGRST205', '42P01']

export async function listerLiveSessions(): Promise<LiveSession[]> {
  const { data, error } = await supabase()
    .from('live_sessions')
    .select('*')
    .order('date_seance')
    .order('heure')
  if (error && TABLE_ABSENTE.includes(error.code)) return []
  return verifier({ data, error }, 'Live Sessions').map(versLiveSession)
}

export async function trouverLiveSession(id: string): Promise<LiveSession | null> {
  const row = verifierOptionnel(
    await supabase().from('live_sessions').select('*').eq('id', id).maybeSingle(),
    'Live Session',
  )
  return row ? versLiveSession(row) : null
}

export async function trouverLiveSessionParSlug(slug: string): Promise<LiveSession | null> {
  const { data, error } = await supabase().from('live_sessions').select('*').eq('slug', slug).maybeSingle()
  if (error && TABLE_ABSENTE.includes(error.code)) return null
  const row = verifierOptionnel({ data, error }, 'Live Session')
  return row ? versLiveSession(row) : null
}

export interface ChampsLiveSession {
  slug: string
  titre: string
  resume: string
  description: string
  prerequis: string[]
  objectifs: string[]
  formateurId: string
  date: string
  heure: string
  dureeMinutes: number
  prixFcfa: number
  places: number
  statut: LiveSession['statut']
  image?: string | null
}

function versColonnes(champs: Partial<ChampsLiveSession>) {
  return {
    ...(champs.slug !== undefined ? { slug: champs.slug } : {}),
    ...(champs.titre !== undefined ? { titre: champs.titre } : {}),
    ...(champs.resume !== undefined ? { resume: champs.resume } : {}),
    ...(champs.description !== undefined ? { description: champs.description } : {}),
    ...(champs.prerequis !== undefined ? { prerequis: champs.prerequis } : {}),
    ...(champs.objectifs !== undefined ? { objectifs: champs.objectifs } : {}),
    ...(champs.formateurId !== undefined ? { formateur_id: champs.formateurId } : {}),
    ...(champs.date !== undefined ? { date_seance: champs.date } : {}),
    ...(champs.heure !== undefined ? { heure: champs.heure } : {}),
    ...(champs.dureeMinutes !== undefined ? { duree_minutes: champs.dureeMinutes } : {}),
    ...(champs.prixFcfa !== undefined ? { prix_fcfa: champs.prixFcfa } : {}),
    ...(champs.places !== undefined ? { places: champs.places } : {}),
    ...(champs.statut !== undefined ? { statut: champs.statut } : {}),
    ...(champs.image !== undefined ? { image: champs.image } : {}),
  }
}

export async function creerLiveSession(
  champs: ChampsLiveSession,
  zoom: { id: string; motDePasse: string; lienParticipation: string; lienHote: string },
): Promise<LiveSession> {
  const { data, error } = await supabase()
    .from('live_sessions')
    .insert({
      slug: champs.slug,
      titre: champs.titre,
      resume: champs.resume,
      description: champs.description,
      prerequis: champs.prerequis,
      objectifs: champs.objectifs,
      formateur_id: champs.formateurId,
      date_seance: champs.date,
      heure: champs.heure,
      duree_minutes: champs.dureeMinutes,
      prix_fcfa: champs.prixFcfa,
      places: champs.places,
      statut: champs.statut,
      image: champs.image ?? null,
      zoom_reunion_id: zoom.id,
      zoom_mot_de_passe: zoom.motDePasse,
      zoom_lien_participation: zoom.lienParticipation,
      zoom_lien_hote: zoom.lienHote,
    })
    .select('*')
    .single()
  if (error?.code === '23505') {
    throw createError({ statusCode: 409, statusMessage: 'Une Live Session porte déjà cette adresse (slug).' })
  }
  if (error) throw traduireErreur(error, 'création de Live Session')
  return versLiveSession(data)
}

export async function majLiveSession(id: string, champs: Partial<ChampsLiveSession>): Promise<LiveSession> {
  const { data, error } = await supabase()
    .from('live_sessions')
    .update(versColonnes(champs) as never)
    .eq('id', id)
    .select('*')
    .single()
  if (error?.code === '23505') {
    throw createError({ statusCode: 409, statusMessage: 'Une Live Session porte déjà cette adresse (slug).' })
  }
  if (error) throw traduireErreur(error, 'modification de Live Session')
  return versLiveSession(data)
}

export async function liensZoomLive(id: string): Promise<{
  reunionId: string | null
  motDePasse: string | null
  lienParticipation: string | null
  lienHote: string | null
}> {
  const row = verifierOptionnel(
    await supabase()
      .from('live_sessions')
      .select('zoom_reunion_id, zoom_mot_de_passe, zoom_lien_participation, zoom_lien_hote')
      .eq('id', id)
      .maybeSingle(),
    'réunion Zoom',
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
  zoom: { id: string; motDePasse: string; lienParticipation: string; lienHote: string },
): Promise<void> {
  verifier(
    await supabase()
      .from('live_sessions')
      .update({
        zoom_reunion_id: zoom.id,
        zoom_mot_de_passe: zoom.motDePasse,
        zoom_lien_participation: zoom.lienParticipation,
        zoom_lien_hote: zoom.lienHote,
      })
      .eq('id', id)
      .select('id'),
    'réunion Zoom',
  )
}

// --- Inscriptions ------------------------------------------------------------

export async function inscrireLive(liveSessionId: string, utilisateurId: string): Promise<number> {
  const { data, error } = await supabase().rpc('inscrire_live_session', {
    p_live_session_id: liveSessionId,
    p_utilisateur_id: utilisateurId,
  })
  if (error) throw traduireErreur(error, 'inscription à la Live Session')
  return data
}

export async function estInscritLive(liveSessionId: string, utilisateurId: string): Promise<boolean> {
  const row = verifierOptionnel(
    await supabase()
      .from('inscriptions_live')
      .select('live_session_id')
      .eq('live_session_id', liveSessionId)
      .eq('utilisateur_id', utilisateurId)
      .maybeSingle(),
    'inscription à la Live Session',
  )
  return row !== null
}

/** Identifiants des Live Sessions où l'apprenant est inscrit. */
export async function listerInscriptionsLiveUtilisateur(utilisateurId: string): Promise<string[]> {
  const { data, error } = await supabase()
    .from('inscriptions_live')
    .select('live_session_id')
    .eq('utilisateur_id', utilisateurId)
  if (error && TABLE_ABSENTE.includes(error.code)) return []
  return verifier({ data, error }, 'inscriptions aux Live Sessions').map((i) => i.live_session_id)
}

export async function listerInscritsLive(liveSessionId: string): Promise<Utilisateur[]> {
  const inscriptions = verifier(
    await supabase().from('inscriptions_live').select('utilisateur_id').eq('live_session_id', liveSessionId),
    'inscrits de la Live Session',
  )
  const ids = inscriptions.map((i) => i.utilisateur_id)
  if (!ids.length) return []
  const rows = verifier(
    await supabase().from('utilisateurs').select('*').in('id', ids).is('supprime_le', null),
    'comptes inscrits',
  )
  return rows.map(versUtilisateur)
}
