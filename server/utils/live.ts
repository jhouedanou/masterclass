import { randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'
import type {
  EtatLiveApprenant,
  EtatLiveFormateur,
  Formateur,
  InscriptionLive,
  Module,
  SessionLive,
  Utilisateur,
  VisibiliteLive,
} from '#shared/types'
import { DELAIS_LIVE } from '#shared/utils/live'
import { supabase } from '../database/client'
import { lireVisibiliteLive, listerSessionsLive } from '../database/live'
import { lireSession } from './session'

/**
 * Règles transverses des Live Sessions (CDC v1.3) : visibilité de la
 * fonctionnalité (10.G), états dérivés pour l'apprenant (§4.3) et le
 * formateur (§4.4), projection publique (RM4, RM13), support de cours (RM5).
 */

// --- Visibilité (10.G) --------------------------------------------------------

let cacheVisibilite: { valeur: VisibiliteLive; lueLe: number } | null = null

/** Réglage lu en base, gardé 30 s : il est consulté par chaque page publique. */
export async function visibiliteLive(): Promise<VisibiliteLive> {
  if (cacheVisibilite && Date.now() - cacheVisibilite.lueLe < 30_000) return cacheVisibilite.valeur
  const valeur = await lireVisibiliteLive()
  cacheVisibilite = { valeur, lueLe: Date.now() }
  return valeur
}

export function oublierVisibiliteLive(): void {
  cacheVisibilite = null
}

export function estAdmin(utilisateur: Pick<Utilisateur, 'role'> | null | undefined): boolean {
  return utilisateur?.role === 'admin-contenu' || utilisateur?.role === 'admin-superieur'
}

/** `tous` : tout le monde ; `admins` : les admins seuls, pour tester en production ; `personne` : masqué. */
export function liveVisiblePour(visibilite: VisibiliteLive, utilisateur: Pick<Utilisateur, 'role'> | null): boolean {
  return visibilite === 'tous' || (visibilite === 'admins' && estAdmin(utilisateur))
}

/**
 * Garde des routes publiques, apprenant et formateur : la fonctionnalité
 * masquée répond 404, comme une page qui n'existe pas.
 */
export async function exigerLiveVisible(event: H3Event): Promise<{ utilisateur: Utilisateur | null }> {
  const [visibilite, utilisateur] = await Promise.all([visibiliteLive(), lireSession(event)])
  if (!liveVisiblePour(visibilite, utilisateur)) {
    throw createError({ statusCode: 404, statusMessage: 'Page introuvable' })
  }
  return { utilisateur }
}

/** Statut de module affiché : un module en Live Session reste « À venir » tant que la fonctionnalité est masquée. */
export function statutModuleAffiche(statut: Module['statut'], liveVisible: boolean): Module['statut'] {
  return statut === 'live-session' && !liveVisible ? 'annonce' : statut
}

// --- États dérivés ------------------------------------------------------------

const MINUTE = 60_000

export function debutMs(session: Pick<SessionLive, 'debut'>): number {
  return new Date(session.debut).getTime()
}

/** Inscriptions ouvertes jusqu'au début ou jusqu'à capacité atteinte (RM3). */
export function etatInscriptions(
  session: Pick<SessionLive, 'statut' | 'debut' | 'capacite'>,
  placesPrises: number,
  maintenant = Date.now(),
): { ouvertes: boolean; complet: boolean; closes: boolean } {
  const closes = session.statut !== 'publiee' || maintenant >= debutMs(session)
  const complet = !closes && placesPrises >= session.capacite
  return { ouvertes: !closes && !complet, complet, closes }
}

/** État de la carte Live Session dans l'espace apprenant (§4.3). */
export function etatApprenant(
  session: Pick<SessionLive, 'statut' | 'debut'>,
  module: Pick<Module, 'statut'>,
  maintenant = Date.now(),
): EtatLiveApprenant {
  if (session.statut === 'annulee') return 'annulee'
  if (module.statut === 'disponible') return 'module-disponible'
  if (session.statut === 'terminee') return 'terminee'
  if (maintenant >= debutMs(session) - DELAIS_LIVE.lienApprenantMinutes * MINUTE) return 'lien-disponible'
  return 'inscrit'
}

/** Statut de la session dans l'espace formateur (§4.4). `null` : elle sort de la liste. */
export function etatFormateur(
  session: Pick<SessionLive, 'statut' | 'debut'>,
  module: Pick<Module, 'statut'>,
  maintenant = Date.now(),
): EtatLiveFormateur | null {
  if (session.statut === 'annulee') return 'annulee'
  if (module.statut === 'disponible' && session.statut === 'terminee') return null
  if (session.statut === 'terminee') return 'terminee'
  if (session.statut === 'brouillon') return null
  if (maintenant >= debutMs(session) - DELAIS_LIVE.animerMinutes * MINUTE) return 'aujourdhui'
  return 'planifiee'
}

/** Échéance de publication de la vidéo montée (RM11, §4.2) et son niveau d'alerte. */
export function echeanceVideo(session: Pick<SessionLive, 'termineLe' | 'statut'>, maintenant = Date.now()) {
  if (session.statut !== 'terminee' || !session.termineLe) return null
  const echeance = new Date(session.termineLe).getTime() + DELAIS_LIVE.publicationVideoJours * 24 * 60 * MINUTE
  const joursRestants = Math.ceil((echeance - maintenant) / (24 * 60 * MINUTE))
  return {
    echeance: new Date(echeance).toISOString(),
    joursRestants,
    niveau: joursRestants < 0 ? ('depassee' as const) : joursRestants <= 5 ? ('proche' as const) : ('normale' as const),
  }
}

// --- Projection publique (RM4, RM13) -----------------------------------------

/**
 * Ce qu'une page publique reçoit d'une session : ni champ Zoom, ni support,
 * ni nombre d'inscrits. Écrite champ par champ, comme `formateurPublic`.
 */
export function sessionLivePublique(
  session: SessionLive,
  module: Module,
  formateur: Pick<Formateur, 'nom' | 'slug' | 'expertise' | 'photo' | 'photoAlt'> | null,
) {
  return {
    id: session.id,
    slug: session.slug,
    debut: session.debut,
    dureeMinutes: session.dureeMinutes,
    statut: session.statut,
    prerequis: session.prerequis,
    gains: session.gains,
    deroule: session.deroule,
    module: {
      id: module.id,
      slug: module.slug,
      titre: module.titre,
      numero: module.numero,
      programme: module.programme,
      thematiqueId: module.thematiqueId,
      promesse: module.promesse,
      prixFcfa: module.prixFcfa,
      image: module.image,
      imageAlt: module.imageAlt,
    },
    formateur: formateur
      ? { nom: formateur.nom, slug: formateur.slug, expertise: formateur.expertise, photo: formateur.photo, photoAlt: formateur.photoAlt }
      : null,
  }
}

export type SessionLivePublique = ReturnType<typeof sessionLivePublique>

// --- Support de cours (RM5) ----------------------------------------------------

const SEAU_SUPPORTS = 'supports-live'
const EXTENSIONS_SUPPORT: Record<string, string> = {
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt: 'application/vnd.ms-powerpoint',
  zip: 'application/zip',
}
export const TAILLE_MAX_SUPPORT = 50 * 1024 * 1024

let seauVerifie = false

/** Le seau est déclaré par la migration ; on le crée au besoin sur une base qui ne l'a pas. */
async function assurerSeauSupports(): Promise<void> {
  if (seauVerifie) return
  const { error } = await supabase().storage.createBucket(SEAU_SUPPORTS, {
    public: false,
    fileSizeLimit: TAILLE_MAX_SUPPORT,
    allowedMimeTypes: Object.values(EXTENSIONS_SUPPORT),
  })
  if (error && !/already exists/i.test(error.message)) {
    throw createError({ statusCode: 500, statusMessage: `Stockage des supports indisponible (${error.message}).` })
  }
  seauVerifie = true
}

/**
 * URL d'envoi direct vers le seau privé. Le fichier ne passe pas par la
 * fonction serveur, dont le corps de requête est limité à 4,5 Mo sur Vercel.
 * Le nom de l'objet est fabriqué ici ; seule l'extension du fichier choisi
 * est reprise, après contrôle.
 */
export async function preparerDepotSupport(
  sessionId: string,
  nomFichier: string,
  taille: number,
): Promise<{ chemin: string; urlEnvoi: string; jeton: string; type: string; nom: string }> {
  const extension = nomFichier.split('.').pop()?.toLowerCase() ?? ''
  const type = EXTENSIONS_SUPPORT[extension]
  if (!type) {
    throw createError({ statusCode: 422, statusMessage: 'Format refusé : PDF, PowerPoint (.pptx, .ppt) ou archive .zip.' })
  }
  if (!Number.isFinite(taille) || taille <= 0 || taille > TAILLE_MAX_SUPPORT) {
    throw createError({ statusCode: 422, statusMessage: 'Le support doit peser moins de 50 Mo.' })
  }
  await assurerSeauSupports()
  const chemin = `${sessionId}/${randomBytes(12).toString('hex')}.${extension}`
  const { data, error } = await supabase().storage.from(SEAU_SUPPORTS).createSignedUploadUrl(chemin)
  if (error || !data) {
    throw createError({ statusCode: 502, statusMessage: `Dépôt du support impossible — ${error?.message ?? 'réponse vide'}` })
  }
  const nom = nomFichier.replace(/[\\/]/g, '_').slice(0, 120)
  return { chemin, urlEnvoi: data.signedUrl, jeton: data.token, type, nom }
}

/** Vérifie que l'objet annoncé existe bien dans le dossier de la session avant de l'enregistrer. */
export async function supportDepose(sessionId: string, chemin: string): Promise<boolean> {
  if (!chemin.startsWith(`${sessionId}/`) || chemin.includes('..')) return false
  const [dossier, fichier] = chemin.split('/')
  const { data } = await supabase().storage.from(SEAU_SUPPORTS).list(dossier, { search: fichier })
  return Boolean(data?.some((o) => o.name === fichier))
}

/** URL de lecture courte (10 min), au nom du fichier d'origine. */
export async function urlSupportSignee(chemin: string, nom: string): Promise<string> {
  const { data, error } = await supabase()
    .storage.from(SEAU_SUPPORTS)
    .createSignedUrl(chemin, 600, { download: nom })
  if (error || !data) {
    throw createError({ statusCode: 502, statusMessage: 'Support momentanément indisponible.' })
  }
  return data.signedUrl
}

export async function effacerSupport(chemin: string | null | undefined): Promise<void> {
  if (!chemin) return
  await supabase().storage.from(SEAU_SUPPORTS).remove([chemin])
}

/** Inscription qui donne droit au contenu d'après-session (support, quiz). */
export function inscriptionPayante(inscription: InscriptionLive | null | undefined): boolean {
  return inscription?.statut === 'confirmee'
}

// --- Catalogue public -----------------------------------------------------------

/** Session à afficher sur la carte d'un module en Live Session : badge et lien vers la fiche. */
export interface LiveDuModule {
  slug: string
  debut: string
  dureeMinutes: number
}

/**
 * Ce que le catalogue public doit savoir des Live Sessions (badges, CTA,
 * redirection de la fiche module) : quelle session publiée porte chaque
 * module en Live Session.
 *
 * `/api/modules` et `/api/programmes` sont mis en cache une minute pour tous
 * les visiteurs (nuxt.config, routeRules) : la réponse ne peut pas dépendre
 * de qui la demande. Le catalogue ne montre donc les Live Sessions qu'en
 * visibilité `tous`. En `admins`, les admins testent par le menu, la page
 * /live-sessions et les fiches, qui ne sont pas en cache ; les cartes module
 * restent « À venir » pour tout le monde.
 */
export async function contexteLivePublic(_event?: H3Event): Promise<{
  visible: boolean
  parModule: Map<string, LiveDuModule>
}> {
  const visible = (await visibiliteLive()) === 'tous'
  const parModule = new Map<string, LiveDuModule>()
  if (!visible) return { visible, parModule }
  for (const s of await listerSessionsLive({ statuts: ['publiee', 'en-cours'] })) {
    parModule.set(s.moduleId, { slug: s.slug, debut: s.debut, dureeMinutes: s.dureeMinutes })
  }
  return { visible, parModule }
}
