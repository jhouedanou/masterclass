export type ProgrammeSlug = 'social-media' | 'entrepreneurs'

/** Statuts issus de la planche C (contenus) et de la spec SEO §5. */
export type StatutModule = 'disponible' | 'en-preparation' | 'brouillon'
export type StatutPublication = 'brouillon' | 'publie'

/** Bloc « Référencement et partage » du back-office (spec SEO §3). */
export interface SeoFields {
  /** Repère interne — jamais rendu en meta keywords (spec §3). */
  motClePrincipal?: string
  title?: string
  metaDescription?: string
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  /** Réservé aux administrateurs supérieurs. */
  slug?: string
  indexable?: boolean
  canonical?: string
}

export interface Thematique {
  id: string
  numero: number
  nom: string
  /** Les thématiques n'ont pas de page autonome (spec SEO §1). */
  programme: ProgrammeSlug
}

export interface Programme {
  id: string
  slug: ProgrammeSlug
  nom: string
  /** Sous-titre du slide de hero. */
  surtitreHero: string
  /** Seconde partie du H1, la première restant fixe. */
  h1Variable: string
  descriptionHero: string
  ctaHero: string
  descriptionProgramme: string
  descriptionCarte: string
  couleur: string
  seo: SeoFields
}

export interface LigneScript {
  /** Timecode « mm:ss » — cliquable pour déplacer la lecture. */
  temps: string
  texte: string
}

export interface Chapitre {
  libelle: string
  titre: string
  dureeMinutes?: number
  /** Dossier du flux HLS sur le CDN. Absent tant que la vidéo n'est pas
   *  montée — le lecteur affiche alors son écran d'attente. */
  videoCle?: string
  /** Durée mesurée au transcodage, en secondes. Fait autorité sur
   *  `dureeMinutes`, qui reste une estimation éditoriale. */
  videoDureeSecondes?: number
  /** Script synchronisé avec la lecture. Vide tant que la transcription
   *  de production n'a pas été importée. */
  script?: LigneScript[]
}

export interface QuestionReponse {
  question: string
  reponse: string
}

export interface Module {
  id: string
  slug: string
  numero: number
  titre: string
  programme: ProgrammeSlug
  thematiqueId: string
  formateurId: string
  promesse: string
  pourquoi: string
  pourQui: string[]
  prerequis: string
  chapitres: Chapitre[]
  acquis: string[]
  livrable: string
  faq: QuestionReponse[]
  dureeMinutes: number
  prixFcfa: number
  statut: StatutModule
  publieLe: string | null
  majLe: string
  seo: SeoFields
}

export interface Formateur {
  id: string
  slug: string
  nom: string
  expertise: string
  bio: string
  programmePrincipal: ProgrammeSlug
  photo: string
  /** Une fiche incomplète reste non indexable (spec SEO §1). */
  ficheComplete: boolean
  coachingPriveFcfaHeure: number
  seo: SeoFields
}

export interface SessionCoaching {
  id: string
  thematiqueId: string
  programme: ProgrammeSlug
  formateurId: string
  date: string
  heure: string
  dureeMinutes: number
  places: number
  inscrits: number
  /** Présents relevés après la séance. `null` tant que le relevé n'a pas été
   *  saisi : les taux de présence s'effacent alors côté formateur et admin. */
  presents: number | null
  statut: 'planifiee' | 'annulee' | 'terminee'
}

export type CategorieArticle = 'Social Média' | 'Entrepreneuriat' | 'Actualités E-Masterclass Big Five'

export interface Article {
  id: string
  slug: string
  titre: string
  chapo: string
  contenu: string
  auteurId: string
  categorie: CategorieArticle
  image: string
  imageAlt: string
  statut: StatutPublication
  publieLe: string | null
  majLe: string
  tempsLectureMinutes: number
  aLaUne: boolean
  modulesLies: string[]
  seo: SeoFields
}

export type RoleUtilisateur = 'apprenant' | 'formateur' | 'admin-contenu' | 'admin-superieur'

/**
 * Sections du back-office, cochées une à une à la création d'un compte
 * d'administration (planche C, écran 07). Une section non autorisée est
 * masquée, pas seulement désactivée.
 */
export type SectionAdmin =
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

export interface Utilisateur {
  id: string
  prenom: string
  nom: string
  email: string
  whatsapp?: string
  pays?: string
  role: RoleUtilisateur
  /** Fiche apprenant à compléter avant de rejoindre un coaching collectif. */
  ficheCompletee?: boolean
  formateurId?: string
  /** Sections du back-office visibles. Vide hors rôles d'administration ;
   *  ignoré pour un administrateur supérieur, qui voit tout. */
  sectionsAutorisees?: SectionAdmin[]
  /** Renseigné tant que le verrouillage après 5 échecs court. */
  verrouilleJusquA?: string | null
}

export interface Acces {
  moduleId: string
  utilisateurId: string
  progression: number
  acheteLe: string
  termineLe: string | null
}

/** Certificat de participation (libellé maquette) — le document reprend le
 *  squelette « Attestation de suivi de module » fourni par le client. */
export interface Certificat {
  numero: string
  utilisateurId: string
  moduleId: string
  prenomNom: string
  titreModule: string
  programme: string
  thematique: string
  formateur: string
  dureeMinutes: number
  dateRealisation: string
  dateDelivrance: string
  tauxCompletion: number
}

export interface Commande {
  reference: string
  utilisateurId: string
  moduleIds: string[]
  total: number
  moyen: 'mobile-money' | 'wave' | 'djamo' | 'visa'
  statut: 'attente' | 'verification' | 'confirmee' | 'echec'
  creeeLe: string
}

export interface Transaction {
  reference: string
  utilisateurId: string
  moduleId: string
  moyen: 'Orange Money' | 'MTN Money' | 'Moov Money' | 'Wave' | 'Djamo' | 'Visa'
  montant: number
  statut: 'reussie' | 'echouee' | 'en-attente'
  date: string
}

export interface DemandeCoachingPrive {
  id: string
  utilisateurId: string
  apprenant: string
  moduleId: string
  besoins: string
  disponibilites: string
  heures: number
  statut: 'en-attente' | 'confirmee-attente-paiement' | 'payee' | 'realisee'
  creneau?: string
  recueLe: string
}

export interface CandidatureFormateur {
  id: string
  nom: string
  expertise: string
  message: string
  whatsapp: string
  lien?: string
  statut: 'nouvelle' | 'en-etude' | 'refusee'
  recueLe: string
}

export interface EntreeJournal {
  id: string
  auteur: string
  action: string
  cible: string
  date: string
}

/** Persona apprenant — contexte transmis aux formateurs avant une session. */
export interface Persona {
  age?: number
  secteur?: string
  experience?: string
  reseaux?: string
  objectif?: string
}

export interface SujetSession {
  id: string
  sessionId: string
  utilisateurId: string
  apprenant: string
  preoccupation: string
  attente: string
  soumisLe: string
}

export interface NoteFormateur {
  id: string
  formateurId: string
  utilisateurId: string
  origine: 'collective' | 'privee'
  note: number
  commentaire?: string
  date: string
}

export interface InscriptionSession {
  sessionId: string
  utilisateurId: string
  inscritLe: string
}
