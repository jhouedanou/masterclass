import type {
  Acces,
  Article,
  CandidatureFormateur,
  Certificat,
  Chapitre,
  Commande,
  DemandeCoachingPrive,
  EntreeJournal,
  Formateur,
  InscriptionSession,
  Module,
  NoteFormateur,
  Persona,
  Programme,
  SeoFields,
  SessionCoaching,
  SujetSession,
  Thematique,
  Transaction,
  Utilisateur,
} from '#shared/types'
import type {
  AccesRow,
  ArticleRow,
  CandidatureFormateurRow,
  CertificatRow,
  ChapitreRow,
  ColonnesSeo,
  CommandeRow,
  DemandeCoachingPriveRow,
  EntreeJournalRow,
  FormateurRow,
  InscriptionSessionRow,
  ModuleRow,
  NoteFormateurRow,
  PersonaRow,
  ProgrammeRow,
  ReglagesFinanciersRow,
  ReglagesSeoRow,
  SessionCoachingRow,
  SujetSessionRow,
  ThematiqueRow,
  TransactionRow,
  UtilisateurRow,
} from './types'

/**
 * Conversion entre les lignes SQL (snake_case) et les types métier de
 * `shared/types` (camelCase français).
 *
 * C'est cette couche qui garantit que le passage à la base ne change aucune
 * réponse d'API : les vues consomment exactement les mêmes formes qu'avant.
 */

/** En base les champs absents valent `null` ; les types métier les déclarent
 *  facultatifs. `undefined` les fait disparaître de la réponse JSON, comme
 *  lorsque les données vivaient en mémoire. */
function optionnel(valeur: string | null): string | undefined {
  return valeur ?? undefined
}

function optionnelNombre(valeur: number | null): number | undefined {
  return valeur ?? undefined
}

// --- Référencement ---------------------------------------------------------

export function versSeo(row: ColonnesSeo): SeoFields {
  return {
    motClePrincipal: optionnel(row.seo_mot_cle_principal),
    title: optionnel(row.seo_title),
    metaDescription: optionnel(row.seo_meta_description),
    ogTitle: optionnel(row.seo_og_title),
    ogDescription: optionnel(row.seo_og_description),
    ogImage: optionnel(row.seo_og_image),
    canonical: optionnel(row.seo_canonical),
    indexable: row.seo_indexable,
  }
}

/**
 * Sens inverse, pour l'onglet « Référencement et partage » du back-office.
 * Seuls les champs réellement fournis sont renvoyés : une mise à jour partielle
 * ne doit pas écraser les autres colonnes. `slug` est ignoré — c'est une
 * colonne à part entière de l'entité, traitée séparément avec sa redirection.
 */
export function colonnesSeo(seo: Partial<SeoFields>): Partial<ColonnesSeo> {
  const colonnes: Partial<ColonnesSeo> = {}
  if ('motClePrincipal' in seo) colonnes.seo_mot_cle_principal = seo.motClePrincipal ?? null
  if ('title' in seo) colonnes.seo_title = seo.title ?? null
  if ('metaDescription' in seo) colonnes.seo_meta_description = seo.metaDescription ?? null
  if ('ogTitle' in seo) colonnes.seo_og_title = seo.ogTitle ?? null
  if ('ogDescription' in seo) colonnes.seo_og_description = seo.ogDescription ?? null
  if ('ogImage' in seo) colonnes.seo_og_image = seo.ogImage ?? null
  if ('canonical' in seo) colonnes.seo_canonical = seo.canonical ?? null
  if ('indexable' in seo && seo.indexable !== undefined) colonnes.seo_indexable = seo.indexable
  return colonnes
}

// --- Catalogue -------------------------------------------------------------

export function versProgramme(row: ProgrammeRow): Programme {
  return {
    id: row.id,
    slug: row.slug,
    nom: row.nom,
    surtitreHero: row.surtitre_hero,
    h1Variable: row.h1_variable,
    descriptionHero: row.description_hero,
    ctaHero: row.cta_hero,
    descriptionProgramme: row.description_programme,
    descriptionCarte: row.description_carte,
    couleur: row.couleur,
    seo: versSeo(row),
  }
}

export function versThematique(row: ThematiqueRow): Thematique {
  return {
    id: row.id,
    numero: row.numero,
    nom: row.nom,
    programme: row.programme,
  }
}

export function versFormateur(row: FormateurRow): Formateur {
  return {
    id: row.id,
    slug: row.slug,
    nom: row.nom,
    expertise: row.expertise,
    bio: row.bio,
    programmePrincipal: row.programme_principal,
    photo: row.photo,
    ficheComplete: row.fiche_complete,
    coachingPriveFcfaHeure: row.coaching_prive_fcfa_heure,
    seo: versSeo(row),
  }
}

export function versChapitre(row: ChapitreRow): Chapitre {
  return {
    libelle: row.libelle,
    titre: row.titre,
    dureeMinutes: optionnelNombre(row.duree_minutes),
    script: row.script,
  }
}

/** Les chapitres arrivent d'une seconde requête : le module est assemblé ici
 *  plutôt que par une ressource imbriquée PostgREST. */
export function versModule(row: ModuleRow, chapitres: ChapitreRow[] = []): Module {
  return {
    id: row.id,
    slug: row.slug,
    numero: row.numero,
    titre: row.titre,
    programme: row.programme,
    thematiqueId: row.thematique_id,
    formateurId: row.formateur_id,
    promesse: row.promesse,
    pourquoi: row.pourquoi,
    pourQui: row.pour_qui,
    prerequis: row.prerequis,
    chapitres: [...chapitres].sort((a, b) => a.position - b.position).map(versChapitre),
    acquis: row.acquis,
    livrable: row.livrable,
    faq: row.faq,
    dureeMinutes: row.duree_minutes,
    prixFcfa: row.prix_fcfa,
    statut: row.statut,
    publieLe: row.publie_le,
    majLe: row.maj_le,
    seo: versSeo(row),
  }
}

// --- Comptes et parcours ---------------------------------------------------

export function versUtilisateur(row: UtilisateurRow): Utilisateur {
  return {
    id: row.id,
    prenom: row.prenom,
    nom: row.nom,
    email: row.email,
    whatsapp: optionnel(row.whatsapp),
    pays: optionnel(row.pays),
    role: row.role,
    ficheCompletee: row.fiche_completee,
    formateurId: optionnel(row.formateur_id),
    sectionsAutorisees: row.sections_autorisees,
    verrouilleJusquA: row.verrouille_jusqu_a,
  }
}

export function versPersona(row: PersonaRow): Persona {
  return {
    age: optionnelNombre(row.age),
    secteur: optionnel(row.secteur),
    experience: optionnel(row.experience),
    reseaux: optionnel(row.reseaux),
    objectif: optionnel(row.objectif),
  }
}

export function versAcces(row: AccesRow): Acces {
  return {
    moduleId: row.module_id,
    utilisateurId: row.utilisateur_id,
    progression: row.progression,
    acheteLe: row.achete_le,
    termineLe: row.termine_le,
  }
}

// --- Coaching --------------------------------------------------------------

export function versSessionCoaching(row: SessionCoachingRow): SessionCoaching {
  return {
    id: row.id,
    thematiqueId: row.thematique_id,
    programme: row.programme,
    formateurId: row.formateur_id,
    date: row.date_seance,
    // PostgreSQL renvoie « 18:00:00 » ; les vues affichent l'heure telle quelle.
    heure: row.heure.slice(0, 5),
    dureeMinutes: row.duree_minutes,
    places: row.places,
    inscrits: row.inscrits,
    presents: row.presents,
    statut: row.statut,
  }
}

export function versInscriptionSession(row: InscriptionSessionRow): InscriptionSession {
  return {
    sessionId: row.session_id,
    utilisateurId: row.utilisateur_id,
    inscritLe: row.inscrit_le,
  }
}

export function versSujetSession(row: SujetSessionRow): SujetSession {
  return {
    id: row.id,
    sessionId: row.session_id,
    utilisateurId: row.utilisateur_id,
    apprenant: row.apprenant,
    preoccupation: row.preoccupation,
    attente: row.attente,
    soumisLe: row.soumis_le,
  }
}

export function versNoteFormateur(row: NoteFormateurRow): NoteFormateur {
  return {
    id: row.id,
    formateurId: row.formateur_id,
    utilisateurId: row.utilisateur_id,
    origine: row.origine,
    note: row.note,
    commentaire: optionnel(row.commentaire),
    date: row.date_note,
  }
}

export function versDemandeCoachingPrive(row: DemandeCoachingPriveRow): DemandeCoachingPrive {
  return {
    id: row.id,
    utilisateurId: row.utilisateur_id,
    apprenant: row.apprenant,
    moduleId: row.module_id,
    besoins: row.besoins,
    disponibilites: row.disponibilites,
    heures: row.heures,
    statut: row.statut,
    creneau: optionnel(row.creneau),
    recueLe: row.recue_le,
  }
}

// --- Blog ------------------------------------------------------------------

export function versArticle(row: ArticleRow, modulesLies: string[] = []): Article {
  return {
    id: row.id,
    slug: row.slug,
    titre: row.titre,
    chapo: row.chapo,
    contenu: row.contenu,
    auteurId: row.auteur_id,
    categorie: row.categorie,
    image: row.image,
    imageAlt: row.image_alt,
    statut: row.statut,
    publieLe: row.publie_le,
    majLe: row.maj_le,
    tempsLectureMinutes: row.temps_lecture_minutes,
    aLaUne: row.a_la_une,
    modulesLies,
    seo: versSeo(row),
  }
}

// --- Commerce --------------------------------------------------------------

export function versCommande(row: CommandeRow, moduleIds: string[] = []): Commande {
  return {
    reference: row.reference,
    utilisateurId: row.utilisateur_id,
    moduleIds,
    total: row.total,
    moyen: row.moyen,
    statut: row.statut,
    creeeLe: row.creee_le,
  }
}

export function versTransaction(row: TransactionRow): Transaction {
  return {
    reference: row.reference,
    utilisateurId: row.utilisateur_id,
    moduleId: row.module_id,
    moyen: row.moyen,
    montant: row.montant,
    statut: row.statut,
    date: row.date_transaction,
  }
}

export function versCertificat(row: CertificatRow): Certificat {
  return {
    numero: row.numero,
    utilisateurId: row.utilisateur_id,
    moduleId: row.module_id,
    prenomNom: row.prenom_nom,
    titreModule: row.titre_module,
    programme: row.programme,
    thematique: row.thematique,
    formateur: row.formateur,
    dureeMinutes: row.duree_minutes,
    dateRealisation: row.date_realisation,
    dateDelivrance: row.date_delivrance,
    tauxCompletion: row.taux_completion,
  }
}

// --- Administration --------------------------------------------------------

export function versCandidatureFormateur(row: CandidatureFormateurRow): CandidatureFormateur {
  return {
    id: row.id,
    nom: row.nom,
    expertise: row.expertise,
    message: row.message,
    whatsapp: row.whatsapp,
    lien: optionnel(row.lien),
    statut: row.statut,
    recueLe: row.recue_le,
  }
}

export function versEntreeJournal(row: EntreeJournalRow): EntreeJournal {
  return {
    id: row.id,
    auteur: row.auteur,
    action: row.action,
    cible: row.cible,
    date: row.date_entree,
  }
}

export interface ReglagesFinanciers {
  fraisPaiementPourcent: number
  partBigFivePourcent: number
  partFormateurPourcent: number
  objectifInscriptionsMensuel: number
  objectifCaMensuel: number
}

/** Les colonnes `numeric` peuvent remonter en chaîne selon le pilote : on
 *  normalise en nombre, les vues les formatent ensuite. */
export function versReglagesFinanciers(row: ReglagesFinanciersRow): ReglagesFinanciers {
  return {
    fraisPaiementPourcent: Number(row.frais_paiement_pourcent),
    partBigFivePourcent: Number(row.part_big_five_pourcent),
    partFormateurPourcent: Number(row.part_formateur_pourcent),
    objectifInscriptionsMensuel: Number(row.objectif_inscriptions_mensuel),
    objectifCaMensuel: Number(row.objectif_ca_mensuel),
  }
}

export interface ReglagesSeo {
  titreParDefaut: string
  gabaritTitre: string
  descriptionParDefaut: string
  imageSocialeParDefaut: string
  googleSearchConsole: string
  ga4: string
}

export function versReglagesSeo(row: ReglagesSeoRow): ReglagesSeo {
  return {
    titreParDefaut: row.titre_par_defaut,
    gabaritTitre: row.gabarit_titre,
    descriptionParDefaut: row.description_par_defaut,
    imageSocialeParDefaut: row.image_sociale_par_defaut,
    googleSearchConsole: row.google_search_console,
    ga4: row.ga4,
  }
}
