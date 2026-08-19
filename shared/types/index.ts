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

export interface Chapitre {
  libelle: string
  titre: string
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
