import type { Formateur, Module, Programme, Thematique } from '#shared/types'
import { supabase } from './client'
import { traduireErreur, verifier, verifierOptionnel, verifierUn } from './erreurs'
import { versFormateur, versModule, versProgramme, versThematique } from './mappers'
import type { ChapitreRow, ProgrammeSlugSql } from './types'

/**
 * Lecture du catalogue : programmes, thématiques, formateurs et modules.
 *
 * Les jointures sont assemblées ici plutôt que déléguées aux ressources
 * imbriquées de PostgREST — sur un catalogue de dix-huit modules, deux requêtes
 * à plat coûtent moins qu'une description exhaustive des relations dans
 * `types.ts`, et les intentions restent lisibles.
 */

/** Ordre d'affichage repris de la maquette : Social Média avant Entrepreneurs.
 *  Il gouverne le catalogue et toutes les listes de modules. */
const ORDRE_PROGRAMMES: ProgrammeSlugSql[] = ['social-media', 'entrepreneurs']

function parProgrammePuisNumero(
  a: { programme: ProgrammeSlugSql; numero: number },
  b: { programme: ProgrammeSlugSql; numero: number },
) {
  const ecart = ORDRE_PROGRAMMES.indexOf(a.programme) - ORDRE_PROGRAMMES.indexOf(b.programme)
  return ecart !== 0 ? ecart : a.numero - b.numero
}

// --- Programmes ------------------------------------------------------------

export async function listerProgrammes(): Promise<Programme[]> {
  const rows = verifier(await supabase().from('programmes').select('*'), 'programmes')
  return rows
    .sort((a, b) => ORDRE_PROGRAMMES.indexOf(a.slug) - ORDRE_PROGRAMMES.indexOf(b.slug))
    .map(versProgramme)
}

export async function trouverProgramme(slug: string): Promise<Programme | null> {
  const row = verifierOptionnel(
    await supabase()
      .from('programmes')
      .select('*')
      .eq('slug', slug as ProgrammeSlugSql)
      .maybeSingle(),
    'programme',
  )
  return row ? versProgramme(row) : null
}

// --- Thématiques -----------------------------------------------------------

export async function listerThematiques(): Promise<Thematique[]> {
  const rows = verifier(
    await supabase().from('thematiques').select('*').order('numero'),
    'thematiques',
  )
  return rows.sort(parProgrammePuisNumero).map(versThematique)
}

// --- Formateurs ------------------------------------------------------------

export async function listerFormateurs(): Promise<Formateur[]> {
  const rows = verifier(await supabase().from('formateurs').select('*').order('id'), 'formateurs')
  return rows.map(versFormateur)
}

export async function trouverFormateur(id: string): Promise<Formateur | null> {
  const row = verifierOptionnel(
    await supabase().from('formateurs').select('*').eq('id', id).maybeSingle(),
    'formateur',
  )
  return row ? versFormateur(row) : null
}

export async function trouverFormateurParSlug(slug: string): Promise<Formateur | null> {
  const row = verifierOptionnel(
    await supabase().from('formateurs').select('*').eq('slug', slug).maybeSingle(),
    'formateur',
  )
  return row ? versFormateur(row) : null
}

/** Le formateur ne pilote que ces trois champs : le tarif de coaching privé et
 *  le rattachement des modules restent du ressort de l'équipe. */
export async function majFormateur(
  id: string,
  champs: Partial<Pick<Formateur, 'nom' | 'expertise' | 'bio'>>,
): Promise<Formateur> {
  const row = verifier(
    await supabase().from('formateurs').update(champs).eq('id', id).select('*').single(),
    'mise à jour du formateur',
  )
  return versFormateur(row)
}

/**
 * Nouvelle fiche formateur, créée par l'administration (planche C, écran 07b).
 * La fiche naît incomplète et hors index : le formateur la complète depuis son
 * espace, l'équipe la publie ensuite.
 */
export async function creerFormateur(champs: {
  id: string
  slug: string
  nom: string
  expertise: string
  bio: string
  programmePrincipal: ProgrammeSlugSql
  photo: string
}): Promise<Formateur> {
  const { data, error } = await supabase()
    .from('formateurs')
    .insert({
      id: champs.id,
      slug: champs.slug,
      nom: champs.nom,
      expertise: champs.expertise,
      bio: champs.bio,
      programme_principal: champs.programmePrincipal,
      photo: champs.photo,
      fiche_complete: false,
      coaching_prive_fcfa_heure: 50000,
      seo_indexable: false,
    })
    .select('*')
    .single()
  if (error?.code === '23505') {
    throw createError({ statusCode: 409, statusMessage: 'Une fiche formateur porte déjà ce nom' })
  }
  if (error) throw traduireErreur(error, 'création de la fiche formateur')
  return versFormateur(data)
}

export async function supprimerFormateur(id: string): Promise<void> {
  verifier(await supabase().from('formateurs').delete().eq('id', id).select('id'), 'suppression de la fiche formateur')
}

/**
 * Accès « Formateur avec coaching privé » (planche D, écran 05). Fonction à
 * part de `majFormateur`, qui sert l'espace du formateur : lui ne doit pas
 * pouvoir s'activer seul.
 */
export async function majCoachingPriveActif(id: string, actif: boolean): Promise<Formateur> {
  const row = verifierUn(
    await supabase()
      .from('formateurs')
      .update({ coaching_prive_actif: actif })
      .eq('id', id)
      .select('*')
      .maybeSingle(),
    'activation du coaching privé',
    'Formateur introuvable',
  )
  return versFormateur(row)
}

// --- Modules ---------------------------------------------------------------

async function chapitresParModule(moduleIds: string[]): Promise<Map<string, ChapitreRow[]>> {
  const groupes = new Map<string, ChapitreRow[]>()
  if (!moduleIds.length) return groupes

  const rows = verifier(
    await supabase().from('chapitres').select('*').in('module_id', moduleIds).order('position'),
    'chapitres',
  )
  for (const row of rows) {
    const existants = groupes.get(row.module_id)
    if (existants) existants.push(row)
    else groupes.set(row.module_id, [row])
  }
  return groupes
}

export async function listerModules(): Promise<Module[]> {
  const rows = verifier(await supabase().from('modules').select('*').order('numero'), 'modules')
  const chapitres = await chapitresParModule(rows.map((m) => m.id))
  return rows.sort(parProgrammePuisNumero).map((m) => versModule(m, chapitres.get(m.id) ?? []))
}

export async function trouverModule(id: string): Promise<Module | null> {
  const row = verifierOptionnel(
    await supabase().from('modules').select('*').eq('id', id).maybeSingle(),
    'module',
  )
  if (!row) return null
  return versModule(row, (await chapitresParModule([row.id])).get(row.id) ?? [])
}

/**
 * Création d'un module en brouillon. L'identifiant reprend le slug, comme les
 * dix-huit modules d'origine : `mod-<slug>`. Le contenu pédagogique et l'offre
 * s'ajoutent ensuite — la maquette insiste sur ces trois objets indépendants.
 */
export async function creerModule(champs: {
  slug: string
  numero: number
  titre: string
  programme: ProgrammeSlugSql
  thematiqueId: string
  formateurId: string
  promesse?: string
}): Promise<Module> {
  const { data, error } = await supabase()
    .from('modules')
    .insert({
      id: `mod-${champs.slug}`,
      slug: champs.slug,
      numero: champs.numero,
      titre: champs.titre,
      programme: champs.programme,
      thematique_id: champs.thematiqueId,
      formateur_id: champs.formateurId,
      promesse: champs.promesse ?? '',
      pourquoi: '',
      prerequis: '',
      livrable: '',
      statut: 'brouillon',
    })
    .select('*')
    .single()

  if (error?.code === '23505') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Un module porte déjà cette URL ou ce numéro dans le programme',
    })
  }
  if (error) throw traduireErreur(error, 'création du module')

  return versModule(data)
}

/** Champs éditables depuis le back-office. Le référencement passe par
 *  `majSeoEntite` : les deux écrans restent distincts. */
export async function majModule(
  id: string,
  champs: Partial<
    Pick<
      Module,
      | 'titre'
      | 'promesse'
      | 'pourquoi'
      | 'pourQui'
      | 'prerequis'
      | 'acquis'
      | 'livrable'
      | 'faq'
      | 'prixFcfa'
      | 'statut'
      | 'numero'
      | 'thematiqueId'
      | 'formateurId'
      | 'publieLe'
    >
  >,
): Promise<Module> {
  const colonnes: Record<string, unknown> = {}
  if (champs.titre !== undefined) colonnes.titre = champs.titre
  if (champs.promesse !== undefined) colonnes.promesse = champs.promesse
  if (champs.pourquoi !== undefined) colonnes.pourquoi = champs.pourquoi
  if (champs.pourQui !== undefined) colonnes.pour_qui = champs.pourQui
  if (champs.prerequis !== undefined) colonnes.prerequis = champs.prerequis
  if (champs.acquis !== undefined) colonnes.acquis = champs.acquis
  if (champs.livrable !== undefined) colonnes.livrable = champs.livrable
  if (champs.faq !== undefined) colonnes.faq = champs.faq
  if (champs.prixFcfa !== undefined) colonnes.prix_fcfa = champs.prixFcfa
  if (champs.numero !== undefined) colonnes.numero = champs.numero
  if (champs.thematiqueId !== undefined) colonnes.thematique_id = champs.thematiqueId
  if (champs.formateurId !== undefined) colonnes.formateur_id = champs.formateurId

  // Publier un module lui donne sa date de publication si elle manque : la
  // contrainte `module_publie_date` l'exige.
  if (champs.statut !== undefined) {
    colonnes.statut = champs.statut
    if (champs.statut === 'disponible') {
      const actuel = await trouverModule(id)
      if (!actuel?.publieLe) colonnes.publie_le = new Date().toISOString().slice(0, 10)
    }
  }
  if (champs.publieLe !== undefined) colonnes.publie_le = champs.publieLe

  const row = verifierUn(
    await supabase()
      .from('modules')
      .update(colonnes as never)
      .eq('id', id)
      .select('*')
      .maybeSingle(),
    'mise à jour du module',
    'Module introuvable',
  )
  return versModule(row, (await chapitresParModule([row.id])).get(row.id) ?? [])
}

// --- Chapitres -------------------------------------------------------------

export async function creerChapitre(
  moduleId: string,
  champs: { libelle: string; titre: string; dureeMinutes?: number },
): Promise<void> {
  // La position suit la fin de la liste ; le réordonnancement est explicite.
  const existants = (await chapitresParModule([moduleId])).get(moduleId) ?? []
  verifier(
    await supabase()
      .from('chapitres')
      .insert({
        module_id: moduleId,
        position: existants.length,
        libelle: champs.libelle,
        titre: champs.titre,
        duree_minutes: champs.dureeMinutes ?? null,
      })
      .select('id'),
    'ajout du chapitre',
  )
}

export async function majChapitre(
  id: string,
  champs: { libelle?: string; titre?: string; dureeMinutes?: number | null },
): Promise<void> {
  const colonnes: Record<string, unknown> = {}
  if (champs.libelle !== undefined) colonnes.libelle = champs.libelle
  if (champs.titre !== undefined) colonnes.titre = champs.titre
  if (champs.dureeMinutes !== undefined) colonnes.duree_minutes = champs.dureeMinutes

  verifier(
    await supabase()
      .from('chapitres')
      .update(colonnes as never)
      .eq('id', id)
      .select('id'),
    'mise à jour du chapitre',
  )
}

export async function supprimerChapitre(id: string): Promise<void> {
  const { error } = await supabase().from('chapitres').delete().eq('id', id)
  if (error) throw traduireErreur(error, 'suppression du chapitre')
}

/** Réordonnancement par glisser-déposer : la liste reçue fait foi. */
export async function reordonnerChapitres(moduleId: string, ids: string[]): Promise<void> {
  // L'unicité (module_id, position) interdit un simple passage en avant :
  // on décale d'abord hors de portée, puis on repose les positions finales.
  for (const [i, id] of ids.entries()) {
    verifier(
      await supabase()
        .from('chapitres')
        .update({ position: 1000 + i })
        .eq('id', id)
        .eq('module_id', moduleId)
        .select('id'),
      'réordonnancement',
    )
  }
  for (const [i, id] of ids.entries()) {
    verifier(
      await supabase().from('chapitres').update({ position: i }).eq('id', id).select('id'),
      'réordonnancement',
    )
  }
}

/** Chapitres d'un module, sous leur forme brute — l'éditeur a besoin des
 *  identifiants, que le type métier `Chapitre` ne porte pas. */
export async function listerChapitres(moduleId: string) {
  const rows = (await chapitresParModule([moduleId])).get(moduleId) ?? []
  return rows.map((c) => ({
    id: c.id,
    position: c.position,
    libelle: c.libelle,
    titre: c.titre,
    dureeMinutes: c.duree_minutes,
    nbLignesScript: c.script.length,
  }))
}

export async function trouverModuleParSlug(slug: string): Promise<Module | null> {
  const row = verifierOptionnel(
    await supabase().from('modules').select('*').eq('slug', slug).maybeSingle(),
    'module',
  )
  if (!row) return null
  return versModule(row, (await chapitresParModule([row.id])).get(row.id) ?? [])
}
