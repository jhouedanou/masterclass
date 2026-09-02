/**
 * Description du schéma `public` pour `@supabase/supabase-js`.
 *
 * Tenue à la main et alignée sur `supabase/migrations/`. `npm run db:types`
 * produit à côté `types.generes.ts` directement depuis la base : c'est le
 * fichier de contrôle à comparer après toute nouvelle migration. Ce fichier-ci
 * reste la source tenue, car les dépôts et les mappers s'appuient sur les types
 * de lignes qu'il exporte nommément.
 *
 * Les jointures ne passent pas par les ressources imbriquées de PostgREST :
 * les dépôts de `server/database/` assemblent les données en TypeScript, ce qui
 * évite d'avoir à décrire ici les relations et garde des requêtes lisibles sur
 * un catalogue de cette taille.
 */

export type ProgrammeSlugSql = 'social-media' | 'entrepreneurs'
export type StatutModuleSql = 'disponible' | 'en-preparation' | 'brouillon'
export type StatutPublicationSql = 'brouillon' | 'publie'
export type RoleUtilisateurSql = 'apprenant' | 'formateur' | 'admin-contenu' | 'admin-superieur'
export type StatutSessionSql = 'planifiee' | 'annulee' | 'terminee'
export type CategorieArticleSql =
  | 'Social Média'
  | 'Entrepreneuriat'
  | 'Actualités E-Masterclass Big Five'
export type MoyenCommandeSql = 'mobile-money' | 'wave' | 'djamo' | 'visa'
export type StatutCommandeSql = 'attente' | 'verification' | 'confirmee' | 'echec'
export type MoyenTransactionSql =
  | 'Orange Money'
  | 'MTN Money'
  | 'Moov Money'
  | 'Wave'
  | 'Djamo'
  | 'Visa'
export type StatutTransactionSql = 'reussie' | 'echouee' | 'en-attente'
export type StatutCoachingPriveSql =
  | 'en-attente'
  | 'confirmee-attente-paiement'
  | 'payee'
  | 'realisee'
export type StatutCandidatureSql = 'nouvelle' | 'en-etude' | 'refusee'
export type OrigineNoteSql = 'collective' | 'privee'
export type CleBlocVitrineSql = 'accueil' | 'banniere' | 'programmes' | 'annonce' | 'legales'
export type SectionAdminSql =
  | 'administration-acces'
  | 'cms-site-vitrine'
  | 'fiches-commerciales'
  | 'modules-chapitres'
  | 'offres-commerciales'
  | 'formateurs'
  | 'calendrier-sessions'
  | 'coaching-prive'
  | 'candidatures-formateurs'
  | 'ressources-scripts'
  | 'blog'
  | 'referencement-contenu'
  | 'referencement-avance'
  | 'historique-versions'
  | 'statistiques-performance'
  | 'performances-marketing'
  | 'transactions-paiements'

/** Colonnes « Référencement et partage », dépliées sur les quatre entités
 *  éditables depuis le back-office. */
export type ColonnesSeo = {
  seo_mot_cle_principal: string | null
  seo_title: string | null
  seo_meta_description: string | null
  seo_og_title: string | null
  seo_og_description: string | null
  seo_og_image: string | null
  seo_canonical: string | null
  seo_indexable: boolean
}

export type ProgrammeRow = ColonnesSeo & {
  id: string
  slug: ProgrammeSlugSql
  nom: string
  surtitre_hero: string
  h1_variable: string
  description_hero: string
  cta_hero: string
  description_programme: string
  description_carte: string
  couleur: string
  cree_le: string
  maj_le: string
}

export type ThematiqueRow = {
  id: string
  numero: number
  nom: string
  programme: ProgrammeSlugSql
  cree_le: string
}

export type FormateurRow = ColonnesSeo & {
  id: string
  slug: string
  nom: string
  expertise: string
  bio: string
  programme_principal: ProgrammeSlugSql
  photo: string
  fiche_complete: boolean
  coaching_prive_fcfa_heure: number
  cree_le: string
  maj_le: string
}

export type ModuleRow = ColonnesSeo & {
  id: string
  slug: string
  numero: number
  titre: string
  programme: ProgrammeSlugSql
  thematique_id: string
  formateur_id: string
  promesse: string
  pourquoi: string
  pour_qui: string[]
  prerequis: string
  acquis: string[]
  livrable: string
  faq: { question: string; reponse: string }[]
  duree_minutes: number
  prix_fcfa: number
  statut: StatutModuleSql
  publie_le: string | null
  cree_le: string
  maj_le: string
}

export type ChapitreRow = {
  id: string
  module_id: string
  position: number
  libelle: string
  titre: string
  duree_minutes: number | null
  script: { temps: string; texte: string }[]
  video_cle: string | null
  video_duree_secondes: number | null
}

export type UtilisateurRow = {
  id: string
  prenom: string
  nom: string
  email: string
  whatsapp: string | null
  pays: string | null
  role: RoleUtilisateurSql
  fiche_completee: boolean
  formateur_id: string | null
  mot_de_passe_hache: string | null
  sections_autorisees: SectionAdminSql[]
  verrouille_jusqu_a: string | null
  derniere_connexion_le: string | null
  cree_le: string
}

export type ConnexionRow = {
  id: string
  utilisateur_id: string | null
  email: string
  ip: string | null
  appareil: string | null
  reussie: boolean
  cree_le: string
}

export type ReinitialisationRow = {
  jeton_hache: string
  utilisateur_id: string
  expire_le: string
  utilise_le: string | null
  cree_le: string
}

export type PersonaRow = {
  utilisateur_id: string
  age: number | null
  secteur: string | null
  experience: string | null
  reseaux: string | null
  objectif: string | null
}

export type AccesRow = {
  utilisateur_id: string
  module_id: string
  progression: number
  achete_le: string
  termine_le: string | null
}

export type SessionCoachingRow = {
  id: string
  thematique_id: string
  programme: ProgrammeSlugSql
  formateur_id: string
  date_seance: string
  heure: string
  duree_minutes: number
  places: number
  inscrits: number
  /** Relevé après la séance ; nul tant qu'il n'a pas été saisi. */
  presents: number | null
  statut: StatutSessionSql
  cree_le: string
}

export type InscriptionSessionRow = {
  session_id: string
  utilisateur_id: string
  inscrit_le: string
}

export type SujetSessionRow = {
  id: string
  session_id: string
  utilisateur_id: string
  apprenant: string
  preoccupation: string
  attente: string
  soumis_le: string
}

export type NoteFormateurRow = {
  id: string
  formateur_id: string
  utilisateur_id: string
  origine: OrigineNoteSql
  note: number
  commentaire: string | null
  date_note: string
  cree_le: string
}

export type ArticleRow = ColonnesSeo & {
  id: string
  slug: string
  titre: string
  chapo: string
  contenu: string
  auteur_id: string
  categorie: CategorieArticleSql
  image: string
  image_alt: string
  statut: StatutPublicationSql
  publie_le: string | null
  temps_lecture_minutes: number
  a_la_une: boolean
  cree_le: string
  maj_le: string
}

export type ArticleModuleRow = {
  article_id: string
  module_id: string
}

export type CommandeRow = {
  reference: string
  utilisateur_id: string
  total: number
  moyen: MoyenCommandeSql
  statut: StatutCommandeSql
  creee_le: string
}

export type CommandeModuleRow = {
  commande_reference: string
  module_id: string
  prix_fcfa: number
}

export type TransactionRow = {
  reference: string
  utilisateur_id: string
  module_id: string
  moyen: MoyenTransactionSql
  montant: number
  statut: StatutTransactionSql
  date_transaction: string
  cree_le: string
}

export type CertificatRow = {
  numero: string
  utilisateur_id: string
  module_id: string
  prenom_nom: string
  titre_module: string
  programme: string
  thematique: string
  formateur: string
  duree_minutes: number
  date_realisation: string
  date_delivrance: string
  taux_completion: number
}

export type DemandeCoachingPriveRow = {
  id: string
  utilisateur_id: string
  apprenant: string
  module_id: string
  besoins: string
  disponibilites: string
  heures: number
  statut: StatutCoachingPriveSql
  creneau: string | null
  recue_le: string
}

export type CandidatureFormateurRow = {
  id: string
  nom: string
  expertise: string
  message: string
  whatsapp: string
  lien: string | null
  statut: StatutCandidatureSql
  recue_le: string
}

export type EntreeJournalRow = {
  id: string
  auteur: string
  action: string
  cible: string
  date_entree: string
}

export type ReglagesFinanciersRow = {
  id: boolean
  frais_paiement_pourcent: number
  part_big_five_pourcent: number
  part_formateur_pourcent: number
  objectif_inscriptions_mensuel: number
  objectif_ca_mensuel: number
  maj_le: string
}

export type ReglagesSeoRow = {
  id: boolean
  titre_par_defaut: string
  gabarit_titre: string
  description_par_defaut: string
  image_sociale_par_defaut: string
  google_search_console: string
  ga4: string
  maj_le: string
}

export type BlocVitrineRow = {
  cle: CleBlocVitrineSql
  libelle: string
  statut: StatutPublicationSql
  contenu: Record<string, unknown>
  publie_du: string | null
  publie_au: string | null
  maj_le: string
  maj_par: string | null
}

export type TemoignageRow = {
  id: string
  auteur: string
  role: string
  texte: string
  position: number
  publie: boolean
  cree_le: string
}

export type ReglagesTrackingRow = {
  id: boolean
  gtm_conteneur: string
  meta_pixel_id: string
  meta_capi_jeton: string
  ga4_mesure: string
  tiktok_pixel_id: string
  linkedin_partner_id: string
  code_personnalise: string
  verrouille: boolean
  maj_le: string
  maj_par: string | null
}

export type RessourceModuleRow = {
  id: string
  module_id: string
  titre: string
  url: string
  format: string
  position: number
  cree_le: string
}

export type VersionContenuRow = {
  id: string
  entite: string
  entite_id: string
  libelle: string
  contenu: Record<string, unknown>
  auteur: string
  cree_le: string
}

export type RedirectionRow = {
  id: string
  de: string
  vers: string
  creee_le: string
}

/** Les colonnes à valeur par défaut sont facultatives à l'insertion. */
type Table<Row, Genere extends keyof Row = never> = {
  Row: Row
  Insert: Omit<Row, Genere> & Partial<Pick<Row, Genere>>
  Update: Partial<Row>
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      programmes: Table<ProgrammeRow, 'cree_le' | 'maj_le' | keyof ColonnesSeo>
      thematiques: Table<ThematiqueRow, 'cree_le'>
      formateurs: Table<FormateurRow, 'cree_le' | 'maj_le' | keyof ColonnesSeo>
      modules: Table<
        ModuleRow,
        | 'cree_le'
        | 'maj_le'
        | keyof ColonnesSeo
        | 'publie_le'
        | 'pour_qui'
        | 'acquis'
        | 'faq'
        | 'duree_minutes'
        | 'prix_fcfa'
        | 'statut'
      >
      chapitres: Table<ChapitreRow, 'id' | 'duree_minutes' | 'script' | 'video_cle' | 'video_duree_secondes'>
      utilisateurs: Table<
        UtilisateurRow,
        | 'id'
        | 'cree_le'
        | 'whatsapp'
        | 'pays'
        | 'role'
        | 'fiche_completee'
        | 'formateur_id'
        | 'mot_de_passe_hache'
        | 'sections_autorisees'
        | 'verrouille_jusqu_a'
        | 'derniere_connexion_le'
      >
      connexions: Table<ConnexionRow, 'id' | 'cree_le' | 'ip' | 'appareil' | 'utilisateur_id'>
      reinitialisations_mot_de_passe: Table<ReinitialisationRow, 'cree_le' | 'utilise_le'>
      personas: Table<PersonaRow, 'age' | 'secteur' | 'experience' | 'reseaux' | 'objectif'>
      acces: Table<AccesRow, 'progression' | 'achete_le' | 'termine_le'>
      sessions_coaching: Table<
        SessionCoachingRow,
        'id' | 'cree_le' | 'duree_minutes' | 'places' | 'inscrits' | 'presents' | 'statut'
      >
      inscriptions_sessions: Table<InscriptionSessionRow, 'inscrit_le'>
      sujets_sessions: Table<SujetSessionRow, 'id' | 'soumis_le'>
      notes_formateurs: Table<NoteFormateurRow, 'id' | 'cree_le' | 'date_note' | 'commentaire'>
      articles: Table<
        ArticleRow,
        | 'cree_le'
        | 'maj_le'
        | keyof ColonnesSeo
        | 'publie_le'
        | 'statut'
        | 'temps_lecture_minutes'
        | 'a_la_une'
      >
      articles_modules: Table<ArticleModuleRow>
      commandes: Table<CommandeRow, 'creee_le' | 'statut'>
      commandes_modules: Table<CommandeModuleRow>
      transactions: Table<TransactionRow, 'cree_le' | 'date_transaction' | 'statut'>
      certificats: Table<CertificatRow, 'date_delivrance'>
      demandes_coaching_prive: Table<DemandeCoachingPriveRow, 'id' | 'recue_le' | 'statut' | 'creneau'>
      candidatures_formateurs: Table<CandidatureFormateurRow, 'id' | 'recue_le' | 'statut' | 'lien'>
      journal: Table<EntreeJournalRow, 'id' | 'date_entree'>
      reglages_financiers: Table<ReglagesFinanciersRow, 'id' | 'maj_le'>
      reglages_seo: Table<ReglagesSeoRow, 'id' | 'maj_le'>
      redirections: Table<RedirectionRow, 'id' | 'creee_le'>
      blocs_vitrine: Table<BlocVitrineRow, 'statut' | 'contenu' | 'publie_du' | 'publie_au' | 'maj_le' | 'maj_par'>
      temoignages: Table<TemoignageRow, 'id' | 'cree_le' | 'position' | 'publie'>
      reglages_tracking: Table<ReglagesTrackingRow, 'id' | 'maj_le' | 'maj_par'>
      ressources_modules: Table<RessourceModuleRow, 'id' | 'cree_le' | 'position' | 'format'>
      versions_contenu: Table<VersionContenuRow, 'id' | 'cree_le'>
    }
    // `{ [_ in never]: never }` est la forme qu'attend postgrest-js pour une
    // collection vide : `Record<string, never>` ne satisfait pas la contrainte
    // et fait retomber toutes les tables sur `never`.
    Views: { [_ in never]: never }
    Functions: {
      enregistrer_visionnage: {
        Args: { p_utilisateur_id: string; p_chapitre_id: string; p_secondes_vues: number }
        Returns: number
      }
      reserver_place_session: {
        Args: {
          p_session_id: string
          p_utilisateur_id: string
          p_preoccupation: string
          p_attente: string
          p_apprenant: string
        }
        Returns: number
      }
      delivrer_certificat: {
        Args: { p_utilisateur_id: string; p_module_id: string }
        Returns: CertificatRow
      }
      attribuer_acces: {
        Args: {
          p_utilisateur_id: string
          p_module_id: string
          p_motif: string
          p_auteur: string
        }
        Returns: undefined
      }
      /** Renvoie la date de fin de verrouillage, ou `null`. */
      enregistrer_tentative_connexion: {
        Args: {
          p_email: string
          p_ip: string | null
          p_appareil: string | null
          p_reussie: boolean
        }
        Returns: string | null
      }
    }
    Enums: {
      programme_slug: ProgrammeSlugSql
      statut_module: StatutModuleSql
      statut_publication: StatutPublicationSql
      role_utilisateur: RoleUtilisateurSql
      statut_session: StatutSessionSql
      categorie_article: CategorieArticleSql
      moyen_commande: MoyenCommandeSql
      statut_commande: StatutCommandeSql
      moyen_transaction: MoyenTransactionSql
      statut_transaction: StatutTransactionSql
      statut_coaching_prive: StatutCoachingPriveSql
      statut_candidature: StatutCandidatureSql
      origine_note: OrigineNoteSql
      section_admin: SectionAdminSql
      cle_bloc_vitrine: CleBlocVitrineSql
    }
    CompositeTypes: { [_ in never]: never }
  }
}
