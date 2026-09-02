-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — back office
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 5 sur 6 · source : 20260828140000_back_office.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Back-office : CMS du site vitrine, tracking, ressources et versions
--
-- Complète les écrans de la planche C qui manquaient encore : CMS Site vitrine
-- (écran 06), Tracking & pixels (07), création/édition d'un module avec ses
-- ressources (09), et l'historique de versions avec restauration en un clic,
-- que la maquette attache à chaque bloc éditable.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- CMS du site vitrine
--
-- Un bloc = une zone éditable du site public. Le corps est en JSON : chaque
-- bloc a sa forme propre (des slides pour la bannière, des questions pour la
-- FAQ, un texte pour le bandeau), et les figer en colonnes obligerait à une
-- migration à chaque évolution éditoriale.
-- ---------------------------------------------------------------------------

create type cle_bloc_vitrine as enum (
  'accueil',
  'banniere',
  'programmes',
  'annonce',
  'legales'
);

create table blocs_vitrine (
  cle       cle_bloc_vitrine primary key,
  libelle   text not null,
  statut    statut_publication not null default 'brouillon',
  contenu   jsonb not null default '{}'::jsonb,
  -- Le bandeau d'annonce est le seul bloc programmable dans le temps ; les
  -- deux bornes restent nulles pour les autres.
  publie_du  date,
  publie_au  date,
  maj_le    timestamptz not null default now(),
  maj_par   text,
  constraint periode_annonce_coherente check (publie_du is null or publie_au is null or publie_du <= publie_au)
);

create trigger blocs_vitrine_maj_le
  before update on blocs_vitrine
  for each row execute function touch_maj_le();

comment on table blocs_vitrine is
  'Zones éditables du site public (planche C, écran 06). Chaque bloc porte son propre schéma JSON.';

create table temoignages (
  id       uuid primary key default gen_random_uuid(),
  auteur   text not null,
  role     text not null,
  texte    text not null,
  -- Ordre manuel, comme le prévoit la maquette (« 6 publiés, ordre manuel »).
  position integer not null default 0,
  publie   boolean not null default false,
  cree_le  timestamptz not null default now()
);

create index temoignages_ordre_idx on temoignages (publie, position);

-- ---------------------------------------------------------------------------
-- Tracking et pixels
--
-- Un seul conteneur GTM est injecté ; les pixels se gèrent ensuite dans GTM.
-- L'écran est verrouillé par défaut : un traqueur cassé, ce sont des données
-- publicitaires perdues sans que personne ne s'en aperçoive.
-- ---------------------------------------------------------------------------

create table reglages_tracking (
  id                    boolean primary key default true check (id),
  gtm_conteneur         text not null default '',
  meta_pixel_id         text not null default '',
  meta_capi_jeton       text not null default '',
  ga4_mesure            text not null default '',
  tiktok_pixel_id       text not null default '',
  linkedin_partner_id   text not null default '',
  -- Scripts additionnels injectés dans le <head> — administrateurs supérieurs.
  code_personnalise     text not null default '',
  verrouille            boolean not null default true,
  maj_le                timestamptz not null default now(),
  maj_par               text
);

create trigger reglages_tracking_maj_le
  before update on reglages_tracking
  for each row execute function touch_maj_le();

insert into reglages_tracking (id) values (true);

-- ---------------------------------------------------------------------------
-- Ressources téléchargeables d'un module
--
-- Onglet « Ressources » de l'éditeur de module : les fichiers remis à
-- l'apprenant (modèle, checklist, support).
-- ---------------------------------------------------------------------------

create table ressources_modules (
  id        uuid primary key default gen_random_uuid(),
  module_id text not null references modules (id) on delete cascade on update cascade,
  titre     text not null,
  url       text not null,
  -- Type libre (PDF, XLSX, lien externe) : la liste évoluera sans migration.
  format    text not null default 'PDF',
  position  integer not null default 0,
  cree_le   timestamptz not null default now()
);

create index ressources_modules_module_idx on ressources_modules (module_id, position);

-- ---------------------------------------------------------------------------
-- Historique de versions
--
-- « Chaque bloc a un historique de versions avec restauration en 1 clic ».
-- Une version = l'état complet de l'objet AVANT une modification : restaurer
-- consiste à réécrire ce contenu tel quel.
-- ---------------------------------------------------------------------------

create table versions_contenu (
  id        uuid primary key default gen_random_uuid(),
  -- Table concernée, au sens applicatif : 'modules', 'articles', 'blocs_vitrine'.
  entite    text not null,
  entite_id text not null,
  libelle   text not null,
  contenu   jsonb not null,
  auteur    text not null,
  cree_le   timestamptz not null default now()
);

create index versions_contenu_entite_idx on versions_contenu (entite, entite_id, cree_le desc);

comment on table versions_contenu is
  'État d''un contenu avant modification. Restaurer une version réécrit l''objet avec ce JSON.';

-- ---------------------------------------------------------------------------
-- Contenu initial du CMS
--
-- Repris des textes déjà en dur dans les pages publiques, pour que l'écran
-- s'ouvre sur le contenu réel du site plutôt que sur des champs vides.
-- ---------------------------------------------------------------------------

insert into blocs_vitrine (cle, libelle, statut, contenu) values
  (
    'accueil',
    'Accueil — chiffres clés et FAQ générale',
    'publie',
    jsonb_build_object(
      'chiffres', jsonb_build_array(
        jsonb_build_object('valeur', '18', 'libelle', 'modules de 60 minutes'),
        jsonb_build_object('valeur', '10 000 F', 'libelle', 'par module, accès à vie'),
        jsonb_build_object('valeur', '7', 'libelle', 'formateurs praticiens')
      ),
      'faq', jsonb_build_array()
    )
  ),
  (
    'banniere',
    'Bannière d''accueil — carrousel',
    'publie',
    jsonb_build_object(
      'accrocheFixe', 'Montez en compétences.',
      'dureeSecondes', 6,
      'slides', jsonb_build_array(
        jsonb_build_object(
          'programme', 'social-media',
          'accroche', 'Restez dans la course.',
          'cta', 'Découvrir le programme Social Média',
          'imageFond', '/images/hero/social-media.svg',
          'imageVisuel', ''
        ),
        jsonb_build_object(
          'programme', 'entrepreneurs',
          'accroche', 'Soyez à jour.',
          'cta', 'Découvrir le programme Entrepreneurs',
          'imageFond', '/images/hero/entrepreneurs.svg',
          'imageVisuel', ''
        )
      )
    )
  ),
  (
    'programmes',
    'Pages programmes — introductions et FAQ',
    'publie',
    jsonb_build_object('note', 'Les textes d''introduction sont portés par la table programmes.')
  ),
  (
    'annonce',
    'Bandeau d''annonce global',
    'brouillon',
    jsonb_build_object('texte', '', 'lien', '')
  ),
  (
    'legales',
    'Pages légales — 5 documents',
    'publie',
    jsonb_build_object(
      'documents', jsonb_build_array(
        'mentions-legales', 'cgu', 'cgv', 'confidentialite', 'cookies'
      ),
      'note', 'Textes à valider juridiquement avant mise en ligne.'
    )
  );

-- ---------------------------------------------------------------------------
-- Sécurité : accès serveur uniquement, comme le reste du schéma.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'blocs_vitrine', 'temoignages', 'reglages_tracking',
    'ressources_modules', 'versions_contenu'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end;
$$;
