-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — socle transverse
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 9 sur 21 · source : 20260915120000_socle_transverse.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Socle transverse — fidélité 1:1 aux maquettes
--
-- Ce que plusieurs planches attendent en même temps : le niveau « Phase » de
-- la hiérarchie des contenus (C-02), le statut « Annonce » d'un module et la
-- collecte « Être prévenu du lancement » (A-03c, C-02B, C-24), les points
-- forts et la vidéo de bienvenue (A-03, B-02), les blocs persona du profil
-- apprenant (B-04, D-04, C-13), la suppression différée de quatorze jours
-- (B-12), la liste d'attente et le report d'une session (B-08, C-03), et un
-- journal plus riche (C-16).
--
-- Les valeurs d'énumération ajoutées ici ne sont pas utilisées dans le même
-- fichier : PostgreSQL refuse d'employer une valeur ajoutée dans la
-- transaction qui l'a créée.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Module : statut « Annonce », lancement, points forts, vidéo de bienvenue
-- ---------------------------------------------------------------------------

alter type statut_module add value if not exists 'annonce';

alter table modules
  add column date_lancement  date,
  add column prix_masque     boolean not null default false,
  add column points_forts    text[]  not null default '{}'::text[],
  add column video_intro_cle text;

comment on column modules.date_lancement is
  'Date annoncée pour un module en statut « annonce » (bloc d''achat « Bientôt disponible »).';
comment on column modules.prix_masque is
  'Cache le prix sur la fiche tant que le module n''est qu''annoncé.';
comment on column modules.points_forts is
  'Section « Points forts » de la fiche commerciale (bloc 7).';
comment on column modules.video_intro_cle is
  'Vidéo de bienvenue du module : ne compte pas dans la progression.';

create table alertes_lancement (
  id        uuid primary key default gen_random_uuid(),
  module_id text not null references modules (id) on delete cascade on update cascade,
  email     text not null,
  whatsapp  text,
  cree_le   timestamptz not null default now()
);

create unique index alertes_lancement_unique_idx on alertes_lancement (module_id, lower(email));

comment on table alertes_lancement is
  'Visiteurs à prévenir au lancement d''un module annoncé (planche A, écran 03c, état 4).';

-- ---------------------------------------------------------------------------
-- 2. Hiérarchie des contenus : Programme → Phase → Thématique → Module
-- ---------------------------------------------------------------------------

create table phases (
  id             text primary key,
  programme      programme_slug not null references programmes (slug) on update cascade,
  numero         integer not null,
  nom            text not null,
  statut         statut_publication not null default 'brouillon',
  date_ouverture date,
  cree_le        timestamptz not null default now(),
  unique (programme, numero)
);

comment on table phases is
  'Niveau intermédiaire de la hiérarchie des contenus (planche C, écran 02). Une phase regroupe des thématiques et peut être programmée.';

-- Une phase de départ par programme déjà en base (le seed les pose aussi,
-- sans doublon, pour une base neuve).
insert into phases (id, programme, numero, nom, statut)
select case p.slug when 'social-media' then 'ph-sm-1' else 'ph-ent-1' end, p.slug, 1, 'Phase 1', 'publie'
  from programmes p
on conflict (id) do nothing;

alter table thematiques
  add column phase_id text references phases (id) on update cascade,
  add column statut   statut_publication not null default 'publie';

update thematiques set phase_id = case programme when 'social-media' then 'ph-sm-1' else 'ph-ent-1' end
 where phase_id is null;

alter table thematiques alter column phase_id set not null;

create index thematiques_phase_idx on thematiques (phase_id, numero);

-- ---------------------------------------------------------------------------
-- 3. Profil apprenant : champs communs et blocs persona (B-04)
-- ---------------------------------------------------------------------------

alter table personas
  add column ville             text,
  add column niveau            text,
  -- Bloc « Spécifique au profil Entrepreneur »
  add column entreprise        text,
  add column stade             text,
  add column taille_equipe     text,
  add column canaux            text,
  add column presence_en_ligne text,
  add column budget            text,
  add column defi              text,
  -- Bloc « Spécifique au programme Social Média »
  add column audience          text,
  add column outils            text,
  add column clients           text;

-- ---------------------------------------------------------------------------
-- 4. Compte : suppression différée, date du mot de passe (B-11, B-12)
-- ---------------------------------------------------------------------------

alter table utilisateurs
  add column suppression_prevue_le    timestamptz,
  add column mot_de_passe_maj_le      timestamptz,
  add column derniere_reactivation_le timestamptz;

create index utilisateurs_suppression_idx on utilisateurs (suppression_prevue_le)
  where suppression_prevue_le is not null and supprime_le is null;

comment on column utilisateurs.suppression_prevue_le is
  'Suppression programmée par l''apprenant : le compte est désactivé, la suppression définitive intervient à cette date (14 jours), une reconnexion avant l''annule.';

-- ---------------------------------------------------------------------------
-- 5. Journal des actions : type, objet, adresse, diff, notification (C-16)
-- ---------------------------------------------------------------------------

alter table journal
  add column type         text,
  add column objet        text,
  add column ip           text,
  add column diff         jsonb,
  add column notification text;

create index journal_type_idx on journal (type, date_entree desc);

-- ---------------------------------------------------------------------------
-- 6. Accès : origine et révocation (C-04, C-13, B-01)
-- ---------------------------------------------------------------------------

alter table acces
  add column origine          text not null default 'achat' check (origine in ('achat', 'attribution')),
  add column revoque_le       timestamptz,
  add column motif_revocation text;

-- Les accès attribués gratuitement par l'équipe sont reconnaissables à leur
-- absence de transaction réussie.
update acces a
   set origine = 'attribution'
 where not exists (
   select 1 from transactions t
    where t.utilisateur_id = a.utilisateur_id
      and t.module_id = a.module_id
      and t.statut = 'reussie'
 );

-- ---------------------------------------------------------------------------
-- 7. Sessions : titre, ouverture de la salle, enregistrement, report, liste
--    d'attente (B-08, C-03)
-- ---------------------------------------------------------------------------

alter table sessions_coaching
  add column titre                   text,
  add column ouverture_salle_minutes integer not null default 15 check (ouverture_salle_minutes in (5, 10, 15)),
  add column enregistrement          boolean not null default false,
  add column reportee_de             date;

comment on column sessions_coaching.reportee_de is
  'Date initiale quand la session a été reportée : la carte apprenant affiche « Reportée — nouvelle date ».';

create table liste_attente_sessions (
  session_id     text not null references sessions_coaching (id) on delete cascade on update cascade,
  utilisateur_id text not null references utilisateurs (id) on delete cascade on update cascade,
  inscrit_le     timestamptz not null default now(),
  primary key (session_id, utilisateur_id)
);

comment on table liste_attente_sessions is
  'Liste d''attente d''une session complète (planche B, écran 08, état 5).';

-- ---------------------------------------------------------------------------
-- Sécurité : mêmes règles que les autres tables (accès serveur uniquement).
-- ---------------------------------------------------------------------------

alter table alertes_lancement enable row level security;
alter table phases enable row level security;
alter table liste_attente_sessions enable row level security;
revoke all on alertes_lancement, phases, liste_attente_sessions from anon, authenticated;
