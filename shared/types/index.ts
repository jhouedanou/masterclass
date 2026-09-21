export type ProgrammeSlug = 'social-media' | 'entrepreneurs'

/** Statuts issus de la planche C (contenus) et de la spec SEO §5. */
export type StatutModule = 'disponible' | 'en-preparation' | 'brouillon' | 'annonce'
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

/** Niveau intermédiaire de la hiérarchie des contenus (planche C, écran 02). */
export interface Phase {
  id: string
  programme: ProgrammeSlug
  numero: number
  nom: string
  statut: StatutPublication
  dateOuverture: string | null
}

export interface Thematique {
  id: string
  numero: number
  nom: string
  /** Les thématiques n'ont pas de page autonome (spec SEO §1). */
  programme: ProgrammeSlug
  phaseId: string
  statut: StatutPublication
  /** Ordre dans la phase, piloté par le glisser-déposer de l'écran 02.
   *  Distinct de `numero`, qui reste le numéro montré à l'apprenant. */
  position: number
}

/** Visiteur à prévenir au lancement d'un module annoncé (planche A, 03c). */
export interface AlerteLancement {
  id: string
  moduleId: string
  email: string
  whatsapp?: string
  creeLe: string
}

/** Ressource téléchargeable ou lien d'un module (planche B, écran 02). */
export interface RessourceModule {
  id: string
  moduleId: string
  titre: string
  url: string
  format: string
  position: number
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
  statut: StatutPublication
  seo: SeoFields
}

/**
 * Programme tel que le servent les routes publiques : ses décomptes
 * l'accompagnent, et ses textes en sont déjà garnis (`server/utils/public.ts`).
 */
export interface ProgrammePublic extends Programme {
  nbModules: number
  nbThematiques: number
  nbFormateurs: number
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
  /** Forme de la vidéo : `hls` pour un dossier de manifestes produit par
   *  ffmpeg, `fichier` pour un MP4 unique déposé depuis l'administration. Le
   *  lecteur ne demande pas le même fichier ni n'emprunte le même chemin. */
  videoFormat?: 'hls' | 'fichier'
  /** Nom du fichier d'origine, affiché dans l'éditeur. */
  videoNomFichier?: string
  videoTailleOctets?: number
  videoImporteeLe?: string
  /** Origine de la transcription : fichier importé ou saisie manuelle. */
  scriptFormat?: 'srt' | 'vtt' | 'manuel'
  scriptNomFichier?: string
  scriptImporteLe?: string
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
  /** Date annoncée quand le module est en statut « annonce ». */
  dateLancement: string | null
  /** Prix caché sur la fiche tant que le module n'est qu'annoncé. */
  prixMasque: boolean
  /** Section « Points forts » de la fiche commerciale (bloc 7). */
  pointsForts: string[]
  /** Vidéo de bienvenue : ne compte pas dans la progression. */
  videoIntroCle?: string
  /** Horodatage du « Marquer Prêt » (planche C, écran 09). Un module prêt est
   *  filmé, transcrit et relu ; il n'est pas pour autant en vente. Repasse à
   *  `null` dès qu'un contenu change. */
  pretLe: string | null
  /** Filigrane nominatif en surimpression du lecteur (écran 09). */
  filigraneActif: boolean
  /** Masque tout bouton de téléchargement. N'empêche ni l'enregistrement
   *  d'écran ni la récupération de l'URL signée : c'est le filigrane qui rend
   *  une rediffusion attribuable. */
  telechargementBloque: boolean
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
  /** Texte alternatif du portrait, éditable au back-office. Vide, l'affichage
   *  retombe sur un libellé construit sur le nom. */
  photoAlt?: string
  /** Une fiche incomplète reste non indexable (spec SEO §1). */
  ficheComplete: boolean
  coachingPriveFcfaHeure: number
  /** Ordre d'affichage sur /formateurs, piloté par le glisser-déposer de
   *  l'écran 11. */
  position: number
  /** Accès « Formateur avec coaching privé » (planche D, écran 05) :
   *  verrouillé par défaut, ouvert par l'administration. */
  coachingPriveActif: boolean
  /** Coordonnées internes (planche D, écran 02) : jamais publiées sur
   *  /formateurs ni sur les fiches modules. */
  emailPro?: string
  whatsapp?: string
  /** Horodatage de « Demander l'activation à l'équipe » (planche D, écran 05). */
  activationCoachingDemandeeLe?: string
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
  /** Titre du coaching, saisi par l'équipe (C-03). */
  titre?: string
  /** Minutes avant l'heure où la salle Zoom s'ouvre (15, 10 ou 5). */
  ouvertureSalleMinutes: number
  enregistrement: boolean
  /** Date initiale quand la session a été reportée (B-08, état 6). */
  reporteeDe?: string
  /** Réunion Zoom créée à la planification ; absente en simulation. */
  zoomReunionId?: string
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
  preferencesNotifications?: PreferencesNotifications
  /** Suppression douce demandée par l'apprenant (planche B, écran 12). */
  supprimeLe?: string | null
  /** Suppression programmée : définitive à cette date, annulée par une reconnexion. */
  suppressionPrevueLe?: string | null
  motDePasseMajLe?: string | null
  /** URL publique de la photo de profil, absente tant qu'aucune n'a été déposée
   *  — l'interface retombe alors sur les initiales. */
  photo?: string
  /** Date de création du compte. Posée par la base, absente du contenu de
   *  référence — d'où l'optionnel. */
  creeLe?: string
  /** Pourcentage de complétion du profil apprenant (planche B). */
  completionProfil?: number
}

/** Préférences de notification (planche B, écran 11). */
export interface PreferencesNotifications {
  email: boolean
  whatsapp: boolean
  rappelsSessions: boolean
  nouveautes: boolean
}

export interface Acces {
  moduleId: string
  utilisateurId: string
  progression: number
  acheteLe: string
  termineLe: string | null
  /** Achat ou attribution gratuite par l'équipe (C-04). */
  origine: 'achat' | 'attribution'
  revoqueLe?: string | null
  motifRevocation?: string
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
  /** Identité confirmée par l'apprenant avant génération (planche B, écran 05). */
  prenomNomConfirmeLe?: string
  /** Attestation annulée par l'administration : la vérification la déclare non valable. */
  revoqueLe?: string
  /** Motif de la révocation. Interne — jamais renvoyé par la route publique. */
  motifRevocation?: string
}

export interface Commande {
  reference: string
  utilisateurId: string
  moduleIds: string[]
  /** Séance de coaching privé réglée par cette commande (« Accepter et payer »). */
  demandeCoachingId?: string
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
  /** Renseignés sur une transaction échouée (planche A, écran 04c). */
  codeEchec?: CodeEchecPaiement
  detailEchec?: string
  /** Commande réglée par cette transaction. */
  commandeReference?: string
  /** Référence attribuée par FeexPay, celle que porte le webhook. */
  referencePrestataire?: string
  /** Réseau exact restitué par FeexPay (« ORANGE CI », « WAVE CI »…). */
  reseau?: string
}

/** Les six cas d'erreur du tunnel de paiement (planche A, écran 04c). */
export type CodeEchecPaiement =
  | 'solde-insuffisant'
  | 'annule-utilisateur'
  | 'delai-depasse'
  | 'reseau-operateur'
  | 'carte-refusee'
  | 'interruption-reseau'
  | 'doublon'
  | 'erreur-inconnue'

/**
 * Les six statuts de la planche B, écran 10 : En attente · En étude · Créneau
 * proposé (`confirmee-attente-paiement`) · Confirmée (payée) (`payee`) ·
 * Réalisée · Refusée / expirée. `annulee` = retirée par l'apprenant.
 */
export type StatutCoachingPrive =
  | 'en-attente'
  | 'en-etude'
  | 'confirmee-attente-paiement'
  | 'payee'
  | 'realisee'
  | 'refusee'
  | 'expiree'
  | 'annulee'

/** Créneau proposé par l'apprenant dans sa demande. */
/** Créneau proposé par l'apprenant : jour de la semaine + tranche horaire
 *  (planche B, écran 04). Les demandes antérieures portent une date. */
export interface CreneauCoaching {
  /** « lundi » … « dimanche ». */
  jour?: string
  /** « AAAA-MM-JJ » — ancienne forme, conservée pour les demandes existantes. */
  date?: string
  debut: string
  fin: string
}

export const JOURS_SEMAINE = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const

export interface DemandeCoachingPrive {
  id: string
  utilisateurId: string
  apprenant: string
  moduleId: string
  /** Choisi par l'apprenant parmi les formateurs dont le coaching privé est activé. */
  formateurId: string
  besoins: string
  disponibilites: string
  creneaux: CreneauCoaching[]
  heures: number
  statut: StatutCoachingPrive
  creneau?: string
  creneauRetenuLe?: string
  lienSession?: string
  motifRefus?: string
  recueLe: string
  /** Montant proposé par l'équipe (heures × tarif), avec le créneau. */
  montantFcfa?: number
  zoomReunionId?: string
  evenementAgendaId?: string
}

/** Suivi daté d'une demande (planche B, écran 10). */
export interface HistoriqueCoachingPrive {
  id: string
  demandeId: string
  statut: StatutCoachingPrive
  auteur: string
  commentaire?: string
  creeLe: string
}

export interface CandidatureFormateur {
  id: string
  nom: string
  expertise: string
  message: string
  whatsapp: string
  email?: string
  /** Portfolio ou site. */
  lien?: string
  linkedin?: string
  statut: 'nouvelle' | 'en-etude' | 'refusee' | 'acceptee'
  recueLe: string
  traiteeLe?: string
  /** Fiche formateur créée à partir de la candidature acceptée. */
  formateurId?: string
}

export interface EntreeJournal {
  id: string
  auteur: string
  action: string
  cible: string
  date: string
  /** Famille d'action (contenu, acces, session, compte…) — filtre C-16. */
  type?: string
  /** Objet touché (module, article, apprenant…) — filtre C-16. */
  objet?: string
  ip?: string
  /** État précédent et nouvel état quand l'action modifie un contenu. */
  diff?: Record<string, unknown>
  /** « Notification envoyée ✓ » quand l'action a déclenché un envoi. */
  notification?: string
}

/** Persona apprenant — contexte transmis aux formateurs avant une session
 *  (planche B, écran 04 : champs communs + bloc propre au programme). */
export interface Persona {
  age?: number
  ville?: string
  secteur?: string
  /** Niveau d'expérience (liste fermée : debutant, intermediaire, confirme). */
  niveau?: string
  experience?: string
  objectif?: string
  // Bloc « Spécifique au profil Entrepreneur »
  entreprise?: string
  stade?: string
  tailleEquipe?: string
  canaux?: string
  presenceEnLigne?: string
  budget?: string
  defi?: string
  // Bloc « Spécifique au programme Social Média »
  reseaux?: string
  audience?: string
  outils?: string
  clients?: string
}

export interface SujetSession {
  id: string
  sessionId: string
  utilisateurId: string
  apprenant: string
  preoccupation: string
  attente: string
  soumisLe: string
  /** Date de lecture par le formateur. Absente tant qu'il n'a pas ouvert la
   *  liste : c'est le compteur « Sujets à lire » (planche D, écran 01). */
  luLe?: string
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
  /** Présence pointée après la séance ; `null` tant qu'elle n'est pas relevée. */
  present?: boolean | null
}

// --- Blocs du site vitrine (CMS, planche C écran 15) -----------------------
//
// Le contenu d'un bloc est stocké en `jsonb` : ces formes le typent des deux
// côtés, de l'éditeur du back-office jusqu'à la page publique.

/** Un slide de la bannière d'accueil (planche A, écran 01). */
export interface SlideBanniere {
  /** Slug du programme : décide la couleur, le lien et l'ordre des thématiques. */
  programme: string
  /** Seconde moitié du H1, la première étant commune à tous les slides. */
  accroche: string
  /** Texte de description affiché sous le H1. */
  description?: string
  cta: string
  imageFond: string
  imageVisuel?: string
  /** Textes alternatifs, éditables : sans eux l'image reste muette. */
  altFond?: string
  altVisuel?: string
}

export interface ContenuBanniere {
  /** Première moitié du H1, identique sur tous les slides. */
  accrocheFixe: string
  /** Durée d'affichage d'un slide, en secondes. */
  dureeSecondes: number
  slides: SlideBanniere[]
}

/** Un des cinq documents légaux (planche A, écran 09). */
export interface DocumentLegal {
  /** Segment d'URL : `cgv`, `cgu`, `mentions-legales`… */
  cle: string
  titre: string
  /** Date affichée en tête du document, telle que saisie. */
  maj?: string
  /** Corps du document, en HTML assaini. Vide tant que le juriste n'a rien rendu. */
  corps?: string
}

export interface ContenuLegales {
  note?: string
  documents: DocumentLegal[]
}
