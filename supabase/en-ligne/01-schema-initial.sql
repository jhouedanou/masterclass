-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — schema initial
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 1 sur 6 · source : 20260828120000_schema_initial.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Schéma initial E-Masterclass Big Five
--
-- Reprend à l'identique le modèle porté jusqu'ici par `server/data/db.ts`.
-- Les identifiants textuels historiques (`mod-…`, `for-…`, `th-…`) sont
-- conservés : ils apparaissent dans le contenu, dans les données de démo et
-- dans les références croisées. Les lignes créées par l'application reçoivent
-- un identifiant généré par défaut, calé sur les mêmes préfixes.
--
-- Convention : tables et colonnes en français, snake_case. La conversion vers
-- les types métier camelCase de `shared/types` est faite par
-- `server/database/mappers.ts` — aucune réponse d'API ne change de forme.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Types énumérés
-- ---------------------------------------------------------------------------

create type programme_slug as enum ('social-media', 'entrepreneurs');

create type statut_module as enum ('disponible', 'en-preparation', 'brouillon');

create type statut_publication as enum ('brouillon', 'publie');

create type role_utilisateur as enum (
  'apprenant',
  'formateur',
  'admin-contenu',
  'admin-superieur'
);

create type statut_session as enum ('planifiee', 'annulee', 'terminee');

create type categorie_article as enum (
  'Social Média',
  'Entrepreneuriat',
  'Actualités E-Masterclass Big Five'
);

create type moyen_commande as enum ('mobile-money', 'wave', 'djamo', 'visa');

create type statut_commande as enum ('attente', 'verification', 'confirmee', 'echec');

-- Libellés tels qu'ils sont restitués par le prestataire de paiement.
create type moyen_transaction as enum (
  'Orange Money',
  'MTN Money',
  'Moov Money',
  'Wave',
  'Djamo',
  'Visa'
);

create type statut_transaction as enum ('reussie', 'echouee', 'en-attente');

create type statut_coaching_prive as enum (
  'en-attente',
  'confirmee-attente-paiement',
  'payee',
  'realisee'
);

create type statut_candidature as enum ('nouvelle', 'en-etude', 'refusee');

create type origine_note as enum ('collective', 'privee');

-- ---------------------------------------------------------------------------
-- Séquences des identifiants applicatifs
--
-- Les compteurs `tableau.length + 1` de l'implémentation en mémoire étaient
-- sujets aux collisions dès que deux requêtes arrivaient en parallèle. Une
-- séquence Postgres règle le problème. `seed.sql` les repositionne après
-- insertion des données de démonstration.
-- ---------------------------------------------------------------------------

create sequence seq_session_coaching start with 1;
create sequence seq_sujet_session start with 1;
create sequence seq_note_formateur start with 1;
create sequence seq_entree_journal start with 1;
create sequence seq_demande_coaching_prive start with 1;
create sequence seq_candidature_formateur start with 1;
-- Le premier certificat de production porte le numéro 000129 (spec maquette D).
create sequence seq_certificat start with 129;

-- ---------------------------------------------------------------------------
-- Catalogue : programmes, thématiques, formateurs, modules
--
-- Les colonnes `seo_*` sont dépliées plutôt que stockées en JSON : l'onglet
-- « Référencement et partage » du back-office les édite champ par champ et la
-- détection de doublons de Title / Meta description doit rester requêtable.
-- `seo_mot_cle_principal` est un repère interne, jamais rendu (spec SEO §3).
-- ---------------------------------------------------------------------------

create table programmes (
  id                     text primary key,
  slug                   programme_slug not null unique,
  nom                    text not null,
  surtitre_hero          text not null,
  h1_variable            text not null,
  description_hero       text not null,
  cta_hero               text not null,
  description_programme  text not null,
  description_carte      text not null,
  couleur                text not null,
  seo_mot_cle_principal  text,
  seo_title              text,
  seo_meta_description   text,
  seo_og_title           text,
  seo_og_description     text,
  seo_og_image           text,
  seo_canonical          text,
  seo_indexable          boolean not null default true,
  cree_le                timestamptz not null default now(),
  maj_le                 timestamptz not null default now()
);

comment on table programmes is
  'Les deux programmes de la plateforme. Le slug est aussi la clé métier référencée par les thématiques, les modules et les formateurs.';

create table thematiques (
  id        text primary key,
  numero    integer not null,
  nom       text not null,
  programme programme_slug not null references programmes (slug) on update cascade,
  cree_le   timestamptz not null default now(),
  -- Le numéro ordonne les sections de la page programme (spec SEO §1).
  unique (programme, numero)
);

comment on table thematiques is
  'Sections de la page programme : une thématique n''a pas de page autonome (spec SEO §1).';

create table formateurs (
  id                          text primary key,
  slug                        text not null unique,
  nom                         text not null,
  expertise                   text not null,
  bio                         text not null,
  programme_principal         programme_slug not null references programmes (slug) on update cascade,
  photo                       text not null,
  -- Une fiche incomplète reste hors sitemap et non indexable (spec SEO §1).
  fiche_complete              boolean not null default false,
  coaching_prive_fcfa_heure   integer not null default 50000 check (coaching_prive_fcfa_heure >= 0),
  seo_mot_cle_principal       text,
  seo_title                   text,
  seo_meta_description        text,
  seo_og_title                text,
  seo_og_description          text,
  seo_og_image                text,
  seo_canonical               text,
  seo_indexable               boolean not null default true,
  cree_le                     timestamptz not null default now(),
  maj_le                      timestamptz not null default now()
);

create table modules (
  id                     text primary key,
  slug                   text not null unique,
  numero                 integer not null,
  titre                  text not null,
  programme              programme_slug not null references programmes (slug) on update cascade,
  thematique_id          text not null references thematiques (id) on update cascade,
  formateur_id           text not null references formateurs (id) on update cascade,
  promesse               text not null,
  pourquoi               text not null,
  pour_qui               text[] not null default '{}',
  prerequis              text not null,
  acquis                 text[] not null default '{}',
  livrable               text not null,
  -- Questions/réponses propres au module, suivies du tronc commun.
  faq                    jsonb not null default '[]'::jsonb,
  duree_minutes          integer not null default 60 check (duree_minutes > 0),
  prix_fcfa              integer not null default 10000 check (prix_fcfa >= 0),
  statut                 statut_module not null default 'brouillon',
  publie_le              date,
  seo_mot_cle_principal  text,
  seo_title              text,
  seo_meta_description   text,
  seo_og_title           text,
  seo_og_description     text,
  seo_og_image           text,
  seo_canonical          text,
  seo_indexable          boolean not null default false,
  cree_le                timestamptz not null default now(),
  maj_le                 timestamptz not null default now(),
  -- Un module publié porte forcément une date de publication.
  constraint module_publie_date check (statut <> 'disponible' or publie_le is not null),
  -- Le numéro affiché « Module n » court de 1 à 9 dans chaque programme.
  unique (programme, numero)
);

create index modules_thematique_idx on modules (thematique_id);
create index modules_formateur_idx on modules (formateur_id);
-- Le catalogue public écarte systématiquement les brouillons.
create index modules_programme_statut_idx on modules (programme, statut);

create table chapitres (
  id            uuid primary key default gen_random_uuid(),
  module_id     text not null references modules (id) on delete cascade on update cascade,
  position      integer not null check (position >= 0),
  libelle       text not null,
  titre         text not null,
  duree_minutes integer check (duree_minutes > 0),
  -- Transcription synchronisée : [{ temps: 'mm:ss', texte: '…' }]. Toujours lue
  -- et écrite d'un bloc avec le chapitre, elle reste en JSON.
  script        jsonb not null default '[]'::jsonb,
  unique (module_id, position)
);

comment on column chapitres.position is
  'Ordre de lecture, 0 pour l''introduction. Sert aussi à numéroter « Chapitre n ».';

-- ---------------------------------------------------------------------------
-- Comptes et parcours apprenant
-- ---------------------------------------------------------------------------

create table utilisateurs (
  id              text primary key default 'usr-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6),
  prenom          text not null,
  nom             text not null,
  email           text not null,
  whatsapp        text,
  pays            text,
  role            role_utilisateur not null default 'apprenant',
  -- Fiche à compléter avant de rejoindre un coaching collectif.
  fiche_completee boolean not null default false,
  formateur_id    text references formateurs (id) on update cascade,
  cree_le         timestamptz not null default now(),
  -- La connexion se fait sur l'e-mail : la casse ne doit pas créer de doublon.
  constraint utilisateurs_email_unique unique (email),
  -- Seul un compte formateur est rattaché à une fiche formateur.
  constraint utilisateur_formateur_coherent
    check (formateur_id is null or role = 'formateur')
);

create unique index utilisateurs_email_lower_idx on utilisateurs (lower(email));

create table personas (
  utilisateur_id text primary key references utilisateurs (id) on delete cascade on update cascade,
  age            integer check (age between 12 and 120),
  secteur        text,
  experience     text,
  reseaux        text,
  objectif       text
);

comment on table personas is
  'Contexte apprenant transmis aux formateurs avant une session.';

create table acces (
  utilisateur_id text not null references utilisateurs (id) on delete cascade on update cascade,
  module_id      text not null references modules (id) on delete cascade on update cascade,
  progression    integer not null default 0 check (progression between 0 and 100),
  achete_le      date not null default current_date,
  termine_le     date,
  primary key (utilisateur_id, module_id),
  -- Un module marqué terminé est un module à 100 %.
  constraint acces_termine_coherent check (termine_le is null or progression = 100)
);

create index acces_module_idx on acces (module_id);

comment on table acces is
  'Accès à vie à un module, qu''il vienne d''un achat ou d''une attribution gratuite par un administrateur.';

-- ---------------------------------------------------------------------------
-- Coaching collectif
-- ---------------------------------------------------------------------------

create table sessions_coaching (
  id            text primary key default 'ses-' || lpad(nextval('seq_session_coaching')::text, 3, '0'),
  thematique_id text not null references thematiques (id) on update cascade,
  programme     programme_slug not null references programmes (slug) on update cascade,
  formateur_id  text not null references formateurs (id) on update cascade,
  date_seance   date not null,
  heure         time not null,
  duree_minutes integer not null default 120 check (duree_minutes > 0),
  places        integer not null default 25 check (places > 0),
  -- Compteur dénormalisé : il porte les inscriptions de démonstration, qui
  -- n'ont pas de ligne détaillée. `reserver_place_session()` le tient à jour.
  inscrits      integer not null default 0 check (inscrits >= 0),
  -- Nombre de présents, relevé après la séance. Reste nul tant qu'il n'a pas
  -- été saisi : les taux de présence affichés côté formateur et administration
  -- s'effacent plutôt que d'afficher une valeur inventée.
  presents      integer check (presents >= 0),
  statut        statut_session not null default 'planifiee',
  cree_le       timestamptz not null default now(),
  constraint session_places_disponibles check (inscrits <= places),
  constraint session_presents_coherent check (presents is null or presents <= inscrits)
);

create index sessions_coaching_thematique_idx on sessions_coaching (thematique_id);
create index sessions_coaching_formateur_idx on sessions_coaching (formateur_id);

-- Une seule session par thématique et par date, annulations exclues.
create unique index sessions_coaching_thematique_date_idx
  on sessions_coaching (thematique_id, date_seance)
  where statut <> 'annulee';

create table inscriptions_sessions (
  session_id     text not null references sessions_coaching (id) on delete cascade on update cascade,
  utilisateur_id text not null references utilisateurs (id) on delete cascade on update cascade,
  inscrit_le     date not null default current_date,
  primary key (session_id, utilisateur_id)
);

create table sujets_sessions (
  id             text primary key default 'suj-' || lpad(nextval('seq_sujet_session')::text, 3, '0'),
  session_id     text not null references sessions_coaching (id) on delete cascade on update cascade,
  utilisateur_id text not null references utilisateurs (id) on delete cascade on update cascade,
  -- Forme abrégée « Prénom N. » affichée au formateur.
  apprenant      text not null,
  preoccupation  text not null,
  attente        text not null,
  soumis_le      date not null default current_date,
  unique (session_id, utilisateur_id)
);

create index sujets_sessions_session_idx on sujets_sessions (session_id);

create table notes_formateurs (
  id             text primary key default 'note-' || lpad(nextval('seq_note_formateur')::text, 3, '0'),
  formateur_id   text not null references formateurs (id) on delete cascade on update cascade,
  utilisateur_id text not null references utilisateurs (id) on delete cascade on update cascade,
  origine        origine_note not null,
  note           integer not null check (note between 1 and 5),
  commentaire    text,
  date_note      date not null default current_date,
  cree_le        timestamptz not null default now()
);

create index notes_formateurs_formateur_idx on notes_formateurs (formateur_id, cree_le);

comment on table notes_formateurs is
  'Notation par les apprenants : visible de l''administration et du formateur, jamais publiée sur le site.';

-- ---------------------------------------------------------------------------
-- Blog
-- ---------------------------------------------------------------------------

create table articles (
  id                     text primary key,
  slug                   text not null unique,
  titre                  text not null,
  chapo                  text not null,
  contenu                text not null,
  auteur_id              text not null references formateurs (id) on update cascade,
  categorie              categorie_article not null,
  image                  text not null,
  image_alt              text not null,
  statut                 statut_publication not null default 'brouillon',
  publie_le              date,
  temps_lecture_minutes  integer not null default 1 check (temps_lecture_minutes > 0),
  a_la_une               boolean not null default false,
  seo_mot_cle_principal  text,
  seo_title              text,
  seo_meta_description   text,
  seo_og_title           text,
  seo_og_description     text,
  seo_og_image           text,
  seo_canonical          text,
  seo_indexable          boolean not null default true,
  cree_le                timestamptz not null default now(),
  maj_le                 timestamptz not null default now(),
  constraint article_publie_date check (statut <> 'publie' or publie_le is not null)
);

create index articles_statut_publie_idx on articles (statut, publie_le desc);
create index articles_categorie_idx on articles (categorie);

create table articles_modules (
  article_id text not null references articles (id) on delete cascade on update cascade,
  module_id  text not null references modules (id) on delete cascade on update cascade,
  primary key (article_id, module_id)
);

comment on table articles_modules is
  'Modules mis en avant au bas d''un article (champ `modulesLies`).';

-- ---------------------------------------------------------------------------
-- Achats, paiements, certificats
-- ---------------------------------------------------------------------------

create table commandes (
  reference      text primary key,
  utilisateur_id text not null references utilisateurs (id) on update cascade,
  total          integer not null check (total >= 0),
  moyen          moyen_commande not null,
  statut         statut_commande not null default 'attente',
  creee_le       timestamptz not null default now()
);

create index commandes_utilisateur_idx on commandes (utilisateur_id, creee_le desc);

create table commandes_modules (
  commande_reference text not null references commandes (reference) on delete cascade on update cascade,
  module_id          text not null references modules (id) on update cascade,
  -- Prix figé au moment de l'achat : un changement de tarif ne réécrit pas
  -- l'historique des commandes.
  prix_fcfa          integer not null check (prix_fcfa >= 0),
  primary key (commande_reference, module_id)
);

create table transactions (
  reference      text primary key,
  utilisateur_id text not null references utilisateurs (id) on update cascade,
  module_id      text not null references modules (id) on update cascade,
  moyen          moyen_transaction not null,
  montant        integer not null check (montant >= 0),
  statut         statut_transaction not null default 'en-attente',
  date_transaction date not null default current_date,
  cree_le        timestamptz not null default now()
);

create index transactions_date_idx on transactions (date_transaction desc);
create index transactions_utilisateur_idx on transactions (utilisateur_id);

create table certificats (
  numero          text primary key,
  utilisateur_id  text not null references utilisateurs (id) on update cascade,
  module_id       text not null references modules (id) on update cascade,
  -- Instantané volontaire : un certificat délivré ne doit plus jamais changer,
  -- même si le module, le formateur ou le nom de l'apprenant évoluent ensuite.
  prenom_nom      text not null,
  titre_module    text not null,
  programme       text not null,
  thematique      text not null,
  formateur       text not null,
  duree_minutes   integer not null check (duree_minutes > 0),
  date_realisation date not null,
  date_delivrance  date not null default current_date,
  taux_completion integer not null check (taux_completion between 0 and 100),
  -- Un seul certificat par apprenant et par module.
  unique (utilisateur_id, module_id)
);

create index certificats_utilisateur_idx on certificats (utilisateur_id);

-- ---------------------------------------------------------------------------
-- Coaching privé et recrutement
-- ---------------------------------------------------------------------------

create table demandes_coaching_prive (
  id             text primary key default 'dcp-' || lpad(nextval('seq_demande_coaching_prive')::text, 3, '0'),
  utilisateur_id text not null references utilisateurs (id) on delete cascade on update cascade,
  apprenant      text not null,
  module_id      text not null references modules (id) on update cascade,
  besoins        text not null,
  disponibilites text not null,
  heures         integer not null check (heures > 0),
  statut         statut_coaching_prive not null default 'en-attente',
  creneau        text,
  recue_le       date not null default current_date
);

create index demandes_coaching_prive_statut_idx on demandes_coaching_prive (statut);

create table candidatures_formateurs (
  id        text primary key default 'cand-' || lpad(nextval('seq_candidature_formateur')::text, 3, '0'),
  nom       text not null,
  expertise text not null,
  message   text not null,
  whatsapp  text not null,
  lien      text,
  statut    statut_candidature not null default 'nouvelle',
  recue_le  date not null default current_date
);

-- ---------------------------------------------------------------------------
-- Administration : journal, réglages, redirections
-- ---------------------------------------------------------------------------

create table journal (
  id          text primary key default 'j-' || lpad(nextval('seq_entree_journal')::text, 3, '0'),
  auteur      text not null,
  action      text not null,
  cible       text not null,
  date_entree timestamptz not null default now()
);

create index journal_date_idx on journal (date_entree desc);

comment on table journal is
  'Historique des actions d''administration. En lecture seule côté application : rien ne le modifie ni ne le supprime.';

-- Réglages globaux : une seule ligne, garantie par la contrainte sur `id`.
create table reglages_financiers (
  id                             boolean primary key default true check (id),
  frais_paiement_pourcent        numeric(5, 2) not null default 4 check (frais_paiement_pourcent between 0 and 100),
  part_big_five_pourcent         numeric(5, 2) not null default 70 check (part_big_five_pourcent between 0 and 100),
  part_formateur_pourcent        numeric(5, 2) not null default 30 check (part_formateur_pourcent between 0 and 100),
  objectif_inscriptions_mensuel  integer not null default 450 check (objectif_inscriptions_mensuel >= 0),
  objectif_ca_mensuel            integer not null default 4500000 check (objectif_ca_mensuel >= 0),
  maj_le                         timestamptz not null default now(),
  -- La règle refusée par l'API l'est aussi par la base.
  constraint repartition_totalise_cent
    check (part_big_five_pourcent + part_formateur_pourcent = 100)
);

create table reglages_seo (
  id                         boolean primary key default true check (id),
  titre_par_defaut           text not null,
  gabarit_titre              text not null,
  description_par_defaut     text not null,
  image_sociale_par_defaut   text not null,
  google_search_console      text not null default '',
  ga4                        text not null default '',
  maj_le                     timestamptz not null default now()
);

create table redirections (
  id       uuid primary key default gen_random_uuid(),
  de       text not null unique,
  vers     text not null,
  creee_le timestamptz not null default now(),
  -- Une redirection vers elle-même bouclerait.
  constraint redirection_non_circulaire check (de <> vers)
);

comment on table redirections is
  'Redirections permanentes créées lors d''un changement de slug publié (spec SEO §5).';
