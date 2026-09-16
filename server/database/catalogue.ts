import type { AlerteLancement, Formateur, Module, Phase, Programme, Thematique } from '#shared/types'
import { supabase } from './client'
import { traduireErreur, verifier, verifierOptionnel, verifierUn } from './erreurs'
import {
  versAlerteLancement,
  versFormateur,
  versModule,
  versPhase,
  versProgramme,
  versThematique,
} from './mappers'
import type { ChapitreRow, FormateurRow, ProgrammeSlugSql } from './types'

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

/**
 * « + Nouveau programme » (planche C, écran 02) : un programme vide, en
 * brouillon, avec son nom, sa couleur d'accent et son slug.
 *
 * Le slug est un type énuméré en base (`programme_slug`) : tant que la
 * migration qui l'ouvre n'est pas passée, Postgres refuse toute valeur hors
 * des deux existantes — l'erreur est traduite en clair plutôt que laissée
 * brute.
 */
export async function creerProgramme(champs: {
  slug: string
  nom: string
  couleur: string
}): Promise<Programme> {
  if (await trouverProgramme(champs.slug)) {
    throw createError({ statusCode: 409, statusMessage: 'Un programme porte déjà ce slug' })
  }
  const reponse = await supabase()
    .from('programmes')
    .insert({
      slug: champs.slug as ProgrammeSlugSql,
      nom: champs.nom,
      couleur: champs.couleur,
      surtitre_hero: '',
      h1_variable: champs.nom,
      description_hero: '',
      cta_hero: '',
      description_programme: '',
      description_carte: '',
    } as never)
    .select('*')
    .maybeSingle()
  if (reponse.error && /enum|invalid input value/i.test(reponse.error.message)) {
    throw createError({
      statusCode: 422,
      statusMessage:
        'Le catalogue ne connaît que deux programmes : en ajouter un demande une migration du type « programme_slug ».',
    })
  }
  const row = verifierUn(reponse, 'création du programme', 'Programme non créé')
  return versProgramme(row)
}

/** Le nom, la couleur d'accent et la publication d'un programme s'éditent ;
 *  son slug, lui, est un type énuméré en base et le pivot de six tables. */
export async function majProgramme(
  slug: string,
  champs: Partial<Pick<Programme, 'nom' | 'couleur' | 'statut' | 'descriptionCarte' | 'descriptionProgramme'>>,
): Promise<Programme> {
  const colonnes: Record<string, unknown> = {}
  if (champs.nom !== undefined) colonnes.nom = champs.nom
  if (champs.couleur !== undefined) colonnes.couleur = champs.couleur
  if (champs.statut !== undefined) colonnes.statut = champs.statut
  if (champs.descriptionCarte !== undefined) colonnes.description_carte = champs.descriptionCarte
  if (champs.descriptionProgramme !== undefined) {
    colonnes.description_programme = champs.descriptionProgramme
  }

  const row = verifierUn(
    await supabase()
      .from('programmes')
      .update(colonnes as never)
      .eq('slug', slug as ProgrammeSlugSql)
      .select('*')
      .maybeSingle(),
    'mise à jour du programme',
    'Programme introuvable',
  )
  return versProgramme(row)
}

// --- Phases ----------------------------------------------------------------

export async function listerPhases(): Promise<Phase[]> {
  const rows = verifier(await supabase().from('phases').select('*').order('numero'), 'phases')
  return rows
    .sort((a, b) => {
      const ecart = ORDRE_PROGRAMMES.indexOf(a.programme) - ORDRE_PROGRAMMES.indexOf(b.programme)
      return ecart !== 0 ? ecart : a.numero - b.numero
    })
    .map(versPhase)
}

export async function creerPhase(champs: {
  programme: ProgrammeSlugSql
  nom: string
  dateOuverture?: string | null
}): Promise<Phase> {
  const existantes = verifier(
    await supabase().from('phases').select('numero').eq('programme', champs.programme),
    'phases du programme',
  )
  const numero = Math.max(0, ...existantes.map((p) => p.numero)) + 1
  const { data, error } = await supabase()
    .from('phases')
    .insert({
      id: `ph-${champs.programme === 'social-media' ? 'sm' : 'ent'}-${numero}`,
      programme: champs.programme,
      numero,
      nom: champs.nom,
      // Une phase naît en brouillon, comme tout le reste de la hiérarchie.
      statut: 'brouillon',
      date_ouverture: champs.dateOuverture ?? null,
    })
    .select('*')
    .single()
  if (error?.code === '23505') {
    throw createError({ statusCode: 409, statusMessage: 'Une phase porte déjà ce numéro.' })
  }
  if (error) throw traduireErreur(error, 'création de la phase')
  return versPhase(data)
}

export async function majPhase(
  id: string,
  champs: Partial<Pick<Phase, 'nom' | 'statut' | 'dateOuverture'>>,
): Promise<Phase> {
  const colonnes: Record<string, unknown> = {}
  if (champs.nom !== undefined) colonnes.nom = champs.nom
  if (champs.statut !== undefined) colonnes.statut = champs.statut
  if (champs.dateOuverture !== undefined) colonnes.date_ouverture = champs.dateOuverture

  const row = verifierUn(
    await supabase().from('phases').update(colonnes as never).eq('id', id).select('*').maybeSingle(),
    'mise à jour de la phase',
    'Phase introuvable',
  )
  return versPhase(row)
}

/** Une phase ne se supprime que vide : ses thématiques porteraient sinon une
 *  référence morte, et la contrainte les protège déjà. */
export async function supprimerPhase(id: string): Promise<void> {
  const attachees = verifier(
    await supabase().from('thematiques').select('id').eq('phase_id', id),
    'thématiques de la phase',
  )
  if (attachees.length) {
    throw createError({
      statusCode: 409,
      statusMessage: `Cette phase porte ${attachees.length} thématique${attachees.length > 1 ? 's' : ''} : déplacez-les avant de la supprimer.`,
    })
  }
  const { error } = await supabase().from('phases').delete().eq('id', id)
  if (error) throw traduireErreur(error, 'suppression de la phase')
}

// --- Thématiques -----------------------------------------------------------

export async function listerThematiques(): Promise<Thematique[]> {
  const rows = verifier(
    await supabase().from('thematiques').select('*').order('position'),
    'thematiques',
  )
  // L'ordre affiché est celui que l'administration a posé au glisser-déposer,
  // pas la numérotation montrée à l'apprenant : les deux ont divergé le jour
  // où réordonner est devenu possible.
  return rows
    .sort((a, b) => {
      const ecart = ORDRE_PROGRAMMES.indexOf(a.programme) - ORDRE_PROGRAMMES.indexOf(b.programme)
      return ecart !== 0 ? ecart : a.position - b.position
    })
    .map(versThematique)
}

/** Réordonnancement d'une phase : la liste reçue fait foi. */
export async function reordonnerThematiques(phaseId: string, ids: string[]): Promise<void> {
  // Deux passages : l'index unique (phase_id, position) refuserait toute
  // permutation directe, la position cible étant occupée le temps du passage.
  for (const [position, id] of ids.entries()) {
    verifier(
      await supabase()
        .from('thematiques')
        .update({ position: 1000 + position } as never)
        .eq('id', id)
        .eq('phase_id', phaseId)
        .select('id'),
      'réordonnancement des thématiques',
    )
  }
  for (const [position, id] of ids.entries()) {
    verifier(
      await supabase()
        .from('thematiques')
        .update({ position } as never)
        .eq('id', id)
        .select('id'),
      'réordonnancement des thématiques',
    )
  }
}

/**
 * Réordonne les modules d'une thématique (planche C, écran 02 : la poignée
 * ⋮⋮ des lignes de module).
 *
 * `modules.numero` est unique par programme et s'affiche dans le libellé
 * — « Module 05 ». Réordonner revient donc à permuter les numéros déjà
 * attribués à ces modules : on reprend leur ensemble, trié, et on le
 * redistribue dans le nouvel ordre. Les modules des autres thématiques ne
 * bougent pas, et la numérotation du programme reste sans trou.
 *
 * Deux passages, comme pour les thématiques : l'index unique refuserait une
 * permutation directe, le numéro cible étant occupé le temps du passage.
 */
export async function reordonnerModules(ids: string[]): Promise<void> {
  if (ids.length < 2) return
  const actuels = verifier(
    await supabase().from('modules').select('id, numero').in('id', ids),
    'lecture des numéros de module',
  )
  const numeros = actuels.map((m) => m.numero).sort((a, b) => a - b)
  if (numeros.length !== ids.length) {
    throw new Error('Réordonnancement des modules : identifiant inconnu.')
  }
  // Décalage hors de portée le temps de libérer les numéros visés.
  const refuge = Math.max(...numeros) + 1000
  for (const [i, id] of ids.entries()) {
    verifier(
      await supabase().from('modules').update({ numero: refuge + i } as never).eq('id', id).select('id'),
      'réordonnancement des modules',
    )
  }
  for (const [i, id] of ids.entries()) {
    verifier(
      await supabase().from('modules').update({ numero: numeros[i] } as never).eq('id', id).select('id'),
      'réordonnancement des modules',
    )
  }
}

export async function creerThematique(champs: {
  id: string
  nom: string
  programme: ProgrammeSlugSql
  phaseId: string
}): Promise<Thematique> {
  const existantes = verifier(
    await supabase().from('thematiques').select('numero, position').eq('phase_id', champs.phaseId),
    'thématiques de la phase',
  )
  const row = verifierUn(
    await supabase()
      .from('thematiques')
      .insert({
        id: champs.id,
        nom: champs.nom,
        programme: champs.programme,
        phase_id: champs.phaseId,
        // Une thématique naît en brouillon : publier un parent ne publie
        // jamais ses enfants (règle de l'écran 02).
        statut: 'brouillon',
        numero: Math.max(0, ...existantes.map((t) => t.numero)) + 1,
        position: existantes.length,
      })
      .select('*')
      .maybeSingle(),
    'création de la thématique',
    'Thématique introuvable',
  )
  return versThematique(row)
}

export async function majThematique(
  id: string,
  champs: Partial<Pick<Thematique, 'nom' | 'numero' | 'statut' | 'phaseId'>>,
): Promise<Thematique> {
  const colonnes: Record<string, unknown> = {}
  if (champs.nom !== undefined) colonnes.nom = champs.nom
  if (champs.numero !== undefined) colonnes.numero = champs.numero
  if (champs.statut !== undefined) colonnes.statut = champs.statut
  if (champs.phaseId !== undefined) colonnes.phase_id = champs.phaseId

  const row = verifierUn(
    await supabase().from('thematiques').update(colonnes as never).eq('id', id).select('*').maybeSingle(),
    'mise à jour de la thématique',
    'Thématique introuvable',
  )
  return versThematique(row)
}

// --- Formateurs ------------------------------------------------------------

export async function listerFormateurs(): Promise<Formateur[]> {
  // L'ordre est celui que l'administration a posé, sur la page publique comme
  // dans le back-office : `id` servait faute de mieux, et la poignée de
  // glisser-déposer ne commandait rien.
  const rows = verifier(
    await supabase().from('formateurs').select('*').order('position').order('id'),
    'formateurs',
  )
  return rows.map(versFormateur)
}

/** Réordonnancement de la page publique : la liste reçue fait foi. */
export async function reordonnerFormateurs(ids: string[]): Promise<void> {
  for (const [position, id] of ids.entries()) {
    verifier(
      await supabase()
        .from('formateurs')
        .update({ position } as never)
        .eq('id', id)
        .select('id'),
      'réordonnancement des formateurs',
    )
  }
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

/**
 * Champs que le formateur pilote depuis son espace (planche D, écran 02) :
 * identité publique, coordonnées internes et photo. Le tarif de coaching
 * privé, son activation et le rattachement des modules restent du ressort de
 * l'équipe.
 */
/** Ce que le formateur édite lui-même, plus ce que l'administration édite en
 *  son nom depuis l'écran 11. */
export type ChampsProfilFormateur = Partial<
  Pick<
    Formateur,
    | 'nom'
    | 'expertise'
    | 'bio'
    | 'photo'
    | 'emailPro'
    | 'whatsapp'
    | 'programmePrincipal'
    | 'ficheComplete'
  >
>

export async function majFormateur(
  id: string,
  champs: ChampsProfilFormateur,
): Promise<Formateur> {
  const colonnes: Partial<FormateurRow> = {}
  if (champs.nom !== undefined) colonnes.nom = champs.nom
  if (champs.expertise !== undefined) colonnes.expertise = champs.expertise
  if (champs.bio !== undefined) colonnes.bio = champs.bio
  if (champs.photo !== undefined) colonnes.photo = champs.photo
  if (champs.emailPro !== undefined) colonnes.email_pro = champs.emailPro
  if (champs.whatsapp !== undefined) colonnes.whatsapp = champs.whatsapp
  // L'écran 11 édite aussi le programme de rattachement et la complétude de la
  // fiche, que l'espace formateur ne touche pas.
  if (champs.programmePrincipal !== undefined) {
    colonnes.programme_principal = champs.programmePrincipal
  }
  if (champs.ficheComplete !== undefined) colonnes.fiche_complete = champs.ficheComplete

  const row = verifier(
    await supabase().from('formateurs').update(colonnes).eq('id', id).select('*').single(),
    'mise à jour du formateur',
  )
  return versFormateur(row)
}

/**
 * « Demander l'activation à l'équipe » (planche D, écran 05, état verrouillé).
 * Le formateur ne s'active pas lui-même : la demande est horodatée, elle
 * remonte à l'administration qui pose `coaching_prive_actif`.
 */
export async function demanderActivationCoachingPrive(id: string): Promise<Formateur> {
  const row = verifierUn(
    await supabase()
      .from('formateurs')
      .update({ activation_coaching_demandee_le: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .maybeSingle(),
    'demande d’activation du coaching privé',
    'Formateur introuvable',
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
      // Fiche commerciale (écran 02B) : colonnes posées par le socle
      // transverse, restées sans écriture jusqu'ici.
      | 'dateLancement'
      | 'prixMasque'
      | 'pointsForts'
      | 'videoIntroCle'
      | 'pretLe'
      | 'filigraneActif'
      | 'telechargementBloque'
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
  if (champs.dateLancement !== undefined) colonnes.date_lancement = champs.dateLancement
  if (champs.prixMasque !== undefined) colonnes.prix_masque = champs.prixMasque
  if (champs.pointsForts !== undefined) colonnes.points_forts = champs.pointsForts
  if (champs.videoIntroCle !== undefined) colonnes.video_intro_cle = champs.videoIntroCle ?? null
  if (champs.pretLe !== undefined) colonnes.pret_le = champs.pretLe
  if (champs.filigraneActif !== undefined) colonnes.filigrane_actif = champs.filigraneActif
  if (champs.telechargementBloque !== undefined) {
    colonnes.telechargement_bloque = champs.telechargementBloque
  }

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
  await retirerEtatPretModule(moduleId)
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

/**
 * Rattachement d'une vidéo à un chapitre, ou son retrait.
 *
 * Distinct de `majChapitre`, qui ne touche qu'à l'éditorial : ces colonnes-là
 * ne se saisissent pas, elles se constatent à la fin d'un dépôt.
 */
export async function majVideoChapitre(
  id: string,
  champs: {
    videoCle: string | null
    videoFormat: 'hls' | 'fichier' | null
    videoDureeSecondes: number | null
    videoNomFichier: string | null
    videoTailleOctets: number | null
  },
): Promise<void> {
  verifierUn(
    await supabase()
      .from('chapitres')
      .update({
        video_cle: champs.videoCle,
        video_format: champs.videoFormat,
        video_duree_secondes: champs.videoDureeSecondes,
        video_nom_fichier: champs.videoNomFichier,
        video_taille_octets: champs.videoTailleOctets,
        video_importee_le: champs.videoCle ? new Date().toISOString() : null,
      } as never)
      .eq('id', id)
      .select('id')
      .maybeSingle(),
    'rattachement de la vidéo',
    'Chapitre introuvable',
  )
  await retirerEtatPret(id)
}

/** Transcription d'un chapitre, importée ou saisie. */
export async function majScriptChapitre(
  id: string,
  champs: {
    script: { temps: string; texte: string }[]
    format: 'srt' | 'vtt' | 'manuel' | null
    nomFichier: string | null
  },
): Promise<void> {
  verifierUn(
    await supabase()
      .from('chapitres')
      .update({
        script: champs.script,
        script_format: champs.format,
        script_nom_fichier: champs.nomFichier,
        script_importe_le: champs.script.length ? new Date().toISOString() : null,
      } as never)
      .eq('id', id)
      .select('id')
      .maybeSingle(),
    'import du script',
    'Chapitre introuvable',
  )
  await retirerEtatPret(id)
}

/**
 * Un module déclaré prêt puis retouché ne l'est plus.
 *
 * Sans cette remise à zéro, la pastille « Prêt » de l'écran 02 mentirait dès
 * qu'un chapitre change — et c'est elle qui autorise l'ouverture de l'offre.
 */
async function retirerEtatPret(chapitreId: string): Promise<void> {
  const chapitre = verifierOptionnel(
    await supabase().from('chapitres').select('module_id').eq('id', chapitreId).maybeSingle(),
    'chapitre',
  )
  if (chapitre) await retirerEtatPretModule(chapitre.module_id)
}

export async function retirerEtatPretModule(moduleId: string): Promise<void> {
  verifier(
    await supabase()
      .from('modules')
      .update({ pret_le: null } as never)
      .eq('id', moduleId)
      .not('pret_le', 'is', null)
      .select('id'),
    'retrait de l’état prêt',
  )
}

/** Clé de la vidéo d'un chapitre, pour savoir quoi supprimer au diffuseur. */
export async function trouverChapitre(id: string) {
  return verifierOptionnel(
    await supabase().from('chapitres').select('*').eq('id', id).maybeSingle(),
    'chapitre',
  )
}

export async function supprimerChapitre(id: string): Promise<void> {
  // Le module est relevé avant la suppression : après, la jointure n'a plus
  // rien à quoi se raccrocher.
  const chapitre = verifierOptionnel(
    await supabase().from('chapitres').select('module_id').eq('id', id).maybeSingle(),
    'chapitre',
  )
  const { error } = await supabase().from('chapitres').delete().eq('id', id)
  if (error) throw traduireErreur(error, 'suppression du chapitre')
  if (chapitre) await retirerEtatPretModule(chapitre.module_id)
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
    // L'éditeur affiche l'état réel de chaque chapitre : sans ces colonnes, sa
    // ligne « Vidéo : … · script importé ✓ » n'aurait rien à dire.
    videoCle: c.video_cle,
    videoFormat: c.video_format,
    videoNomFichier: c.video_nom_fichier,
    videoDureeSecondes: c.video_duree_secondes,
    videoTailleOctets: c.video_taille_octets ? Number(c.video_taille_octets) : null,
    scriptFormat: c.script_format,
    scriptNomFichier: c.script_nom_fichier,
    scriptImporteLe: c.script_importe_le,
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

// --- Alertes de lancement (planche A, écran 03c, état 4) -------------------

/**
 * Visiteur à prévenir au lancement d'un module annoncé. Une adresse déjà
 * inscrite pour ce module est refusée (409) : l'index unique tranche.
 */
export async function enregistrerAlerteLancement(champs: {
  moduleId: string
  email: string
  whatsapp?: string
}): Promise<AlerteLancement> {
  const { data, error } = await supabase()
    .from('alertes_lancement')
    .insert({ module_id: champs.moduleId, email: champs.email, whatsapp: champs.whatsapp ?? null })
    .select('*')
    .single()
  if (error?.code === '23505') {
    throw createError({ statusCode: 409, statusMessage: 'Vous êtes déjà inscrit : nous vous préviendrons au lancement.' })
  }
  if (error) throw traduireErreur(error, 'alerte de lancement')
  return versAlerteLancement(data)
}

export async function listerAlertesLancement(moduleId?: string): Promise<AlerteLancement[]> {
  let requete = supabase().from('alertes_lancement').select('*').order('cree_le', { ascending: false })
  if (moduleId) requete = requete.eq('module_id', moduleId)
  return verifier(await requete, 'alertes de lancement').map(versAlerteLancement)
}
