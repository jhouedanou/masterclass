import { supabase } from './client'
import { traduireErreur, verifier, verifierOptionnel, verifierUn } from './erreurs'
import type {
  BlocVitrineRow,
  CleBlocVitrineSql,
  RessourceModuleRow,
  StatutPublicationSql,
  TemoignageRow,
  VersionContenuRow,
} from './types'

/**
 * Écrans du back-office qui pilotent le site public : CMS de la vitrine,
 * témoignages, réglages de tracking, ressources de module et historique des
 * versions.
 */

// --- CMS du site vitrine ---------------------------------------------------

export interface BlocVitrine {
  cle: CleBlocVitrineSql
  libelle: string
  statut: StatutPublicationSql
  contenu: Record<string, unknown>
  publieDu: string | null
  publieAu: string | null
  majLe: string
  majPar: string | null
}

function versBloc(row: BlocVitrineRow): BlocVitrine {
  return {
    cle: row.cle,
    libelle: row.libelle,
    statut: row.statut,
    contenu: row.contenu,
    publieDu: row.publie_du,
    publieAu: row.publie_au,
    majLe: row.maj_le,
    majPar: row.maj_par,
  }
}

export async function listerBlocsVitrine(): Promise<BlocVitrine[]> {
  const rows = verifier(await supabase().from('blocs_vitrine').select('*').order('cle'), 'blocs du site')
  return rows.map(versBloc)
}

export async function trouverBlocVitrine(cle: string): Promise<BlocVitrine | null> {
  const row = verifierOptionnel(
    await supabase()
      .from('blocs_vitrine')
      .select('*')
      .eq('cle', cle as CleBlocVitrineSql)
      .maybeSingle(),
    'bloc du site',
  )
  return row ? versBloc(row) : null
}

export async function majBlocVitrine(
  cle: CleBlocVitrineSql,
  champs: {
    contenu?: Record<string, unknown>
    statut?: StatutPublicationSql
    publieDu?: string | null
    publieAu?: string | null
  },
  auteur: string,
): Promise<BlocVitrine> {
  const colonnes: Record<string, unknown> = { maj_par: auteur }
  if (champs.contenu !== undefined) colonnes.contenu = champs.contenu
  if (champs.statut !== undefined) colonnes.statut = champs.statut
  if ('publieDu' in champs) colonnes.publie_du = champs.publieDu ?? null
  if ('publieAu' in champs) colonnes.publie_au = champs.publieAu ?? null

  const row = verifierUn(
    await supabase()
      .from('blocs_vitrine')
      .update(colonnes as never)
      .eq('cle', cle)
      .select('*')
      .maybeSingle(),
    'mise à jour du bloc',
    'Bloc introuvable',
  )
  return versBloc(row)
}

// --- Témoignages -----------------------------------------------------------

export interface Temoignage {
  id: string
  auteur: string
  role: string
  texte: string
  position: number
  publie: boolean
}

const versTemoignage = (row: TemoignageRow): Temoignage => ({
  id: row.id,
  auteur: row.auteur,
  role: row.role,
  texte: row.texte,
  position: row.position,
  publie: row.publie,
})

export async function listerTemoignages(): Promise<Temoignage[]> {
  const rows = verifier(
    await supabase().from('temoignages').select('*').order('position'),
    'témoignages',
  )
  return rows.map(versTemoignage)
}

export async function creerTemoignage(champs: {
  auteur: string
  role: string
  texte: string
  position?: number
}): Promise<Temoignage> {
  const row = verifier(
    await supabase().from('temoignages').insert(champs).select('*').single(),
    'création du témoignage',
  )
  return versTemoignage(row)
}

export async function majTemoignage(
  id: string,
  champs: Partial<Omit<Temoignage, 'id'>>,
): Promise<Temoignage> {
  const row = verifierUn(
    await supabase().from('temoignages').update(champs).eq('id', id).select('*').maybeSingle(),
    'mise à jour du témoignage',
    'Témoignage introuvable',
  )
  return versTemoignage(row)
}

export async function supprimerTemoignage(id: string): Promise<void> {
  const { error } = await supabase().from('temoignages').delete().eq('id', id)
  if (error) throw traduireErreur(error, 'suppression du témoignage')
}

// --- Tracking et pixels ----------------------------------------------------

export interface ReglagesTracking {
  gtmConteneur: string
  metaPixelId: string
  metaCapiJeton: string
  ga4Mesure: string
  tiktokPixelId: string
  linkedinPartnerId: string
  codePersonnalise: string
  verrouille: boolean
  majLe: string
  majPar: string | null
}

export async function lireReglagesTracking(): Promise<ReglagesTracking> {
  const row = verifier(
    await supabase().from('reglages_tracking').select('*').single(),
    'réglages de tracking',
  )
  return {
    gtmConteneur: row.gtm_conteneur,
    metaPixelId: row.meta_pixel_id,
    metaCapiJeton: row.meta_capi_jeton,
    ga4Mesure: row.ga4_mesure,
    tiktokPixelId: row.tiktok_pixel_id,
    linkedinPartnerId: row.linkedin_partner_id,
    codePersonnalise: row.code_personnalise,
    verrouille: row.verrouille,
    majLe: row.maj_le,
    majPar: row.maj_par,
  }
}

/** Chaque changement est journalisé avec son ancienne valeur : c'est la
 *  contrepartie du déverrouillage exigée par la maquette. */
export async function majReglagesTracking(
  champs: Partial<Omit<ReglagesTracking, 'majLe' | 'majPar'>>,
  auteur: string,
): Promise<ReglagesTracking> {
  const colonnes: Record<string, unknown> = { maj_par: auteur }
  if (champs.gtmConteneur !== undefined) colonnes.gtm_conteneur = champs.gtmConteneur
  if (champs.metaPixelId !== undefined) colonnes.meta_pixel_id = champs.metaPixelId
  if (champs.metaCapiJeton !== undefined) colonnes.meta_capi_jeton = champs.metaCapiJeton
  if (champs.ga4Mesure !== undefined) colonnes.ga4_mesure = champs.ga4Mesure
  if (champs.tiktokPixelId !== undefined) colonnes.tiktok_pixel_id = champs.tiktokPixelId
  if (champs.linkedinPartnerId !== undefined) colonnes.linkedin_partner_id = champs.linkedinPartnerId
  if (champs.codePersonnalise !== undefined) colonnes.code_personnalise = champs.codePersonnalise
  if (champs.verrouille !== undefined) colonnes.verrouille = champs.verrouille

  verifier(
    await supabase()
      .from('reglages_tracking')
      .update(colonnes as never)
      .eq('id', true)
      .select('id'),
    'mise à jour du tracking',
  )
  return await lireReglagesTracking()
}

// --- Ressources de module --------------------------------------------------

export interface RessourceModule {
  id: string
  moduleId: string
  titre: string
  url: string
  format: string
  position: number
}

const versRessource = (row: RessourceModuleRow): RessourceModule => ({
  id: row.id,
  moduleId: row.module_id,
  titre: row.titre,
  url: row.url,
  format: row.format,
  position: row.position,
})

export async function listerRessources(moduleId: string): Promise<RessourceModule[]> {
  const rows = verifier(
    await supabase().from('ressources_modules').select('*').eq('module_id', moduleId).order('position'),
    'ressources du module',
  )
  return rows.map(versRessource)
}

export async function creerRessource(champs: {
  moduleId: string
  titre: string
  url: string
  format?: string
  position?: number
}): Promise<RessourceModule> {
  const row = verifier(
    await supabase()
      .from('ressources_modules')
      .insert({
        module_id: champs.moduleId,
        titre: champs.titre,
        url: champs.url,
        format: champs.format ?? 'PDF',
        position: champs.position ?? 0,
      })
      .select('*')
      .single(),
    'ajout de la ressource',
  )
  return versRessource(row)
}

export async function supprimerRessource(id: string): Promise<void> {
  const { error } = await supabase().from('ressources_modules').delete().eq('id', id)
  if (error) throw traduireErreur(error, 'suppression de la ressource')
}

// --- Historique des versions -----------------------------------------------

export interface VersionContenu {
  id: string
  entite: string
  entiteId: string
  libelle: string
  contenu: Record<string, unknown>
  auteur: string
  creeLe: string
}

const versVersion = (row: VersionContenuRow): VersionContenu => ({
  id: row.id,
  entite: row.entite,
  entiteId: row.entite_id,
  libelle: row.libelle,
  contenu: row.contenu,
  auteur: row.auteur,
  creeLe: row.cree_le,
})

/**
 * Enregistre l'état d'un contenu AVANT modification. Appelé juste avant
 * l'écriture : c'est ce qui rend la restauration possible.
 */
export async function enregistrerVersion(champs: {
  entite: string
  entiteId: string
  libelle: string
  contenu: Record<string, unknown>
  auteur: string
}): Promise<void> {
  verifier(
    await supabase()
      .from('versions_contenu')
      .insert({
        entite: champs.entite,
        entite_id: champs.entiteId,
        libelle: champs.libelle,
        contenu: champs.contenu,
        auteur: champs.auteur,
      })
      .select('id'),
    'enregistrement de la version',
  )
}

export async function listerVersions(
  entite?: string,
  entiteId?: string,
  limite = 100,
): Promise<VersionContenu[]> {
  let requete = supabase().from('versions_contenu').select('*')
  if (entite) requete = requete.eq('entite', entite)
  if (entiteId) requete = requete.eq('entite_id', entiteId)

  const rows = verifier(
    await requete.order('cree_le', { ascending: false }).limit(limite),
    'versions',
  )
  return rows.map(versVersion)
}

export async function trouverVersion(id: string): Promise<VersionContenu | null> {
  const row = verifierOptionnel(
    await supabase().from('versions_contenu').select('*').eq('id', id).maybeSingle(),
    'version',
  )
  return row ? versVersion(row) : null
}
