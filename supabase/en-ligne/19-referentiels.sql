-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — referentiels
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 19 sur 34 · source : 20260922120000_referentiels.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Référentiels de valeurs des champs à choix multiple du profil apprenant
--
-- Quatre champs de la fiche apprenant étaient en saisie libre : « Réseaux gérés »
-- et « Outils utilisés » (programme Social Média), « Canaux de vente actuels » et
-- « Présence en ligne existante » (programme Entrepreneurs). Aucune contrainte,
-- pas même un `check` — d'où des orthographes concurrentes d'un même réseau, des
-- abréviations et des saisies fantaisistes, qui rendaient impossible toute
-- lecture agrégée de la population apprenante.
--
-- Le référentiel vit en base plutôt qu'en constante TypeScript : un réseau
-- apparaît, un outil tombe en désuétude, et l'administration doit pouvoir le
-- suivre sans déploiement.
--
-- Les colonnes gardent les **clés** du référentiel, séparées par des virgules
-- (`instagram,tiktok`). Renommer une entrée au back-office se propage alors à
-- toutes les fiches. Le format reste `text` : la convention de fait était déjà
-- une liste séparée par virgules, et `shared/utils/profil.ts` continue de
-- compter ces champs à l'identique — les pourcentages de complétion, qui
-- commandent `fiche_completee` et donc l'inscription aux sessions, ne bougent
-- pas.
--
-- `reseau` sert deux champs : « Réseaux gérés » et « Présence en ligne » puisent
-- dans le même vocabulaire.
--
-- Les entrées initiales sont posées ici, et non dans le seed : la reprise des
-- données ci-dessous a besoin de la table d'appariement, et une installation en
-- production applique les migrations sans jamais rejouer le seed.
-- ---------------------------------------------------------------------------

create type categorie_referentiel as enum ('reseau', 'outil', 'canal');

create table referentiels (
  id        text primary key,
  categorie categorie_referentiel not null,
  -- Clé stable conservée dans les fiches : minuscules, chiffres et tirets.
  cle       text not null check (cle ~ '^[a-z0-9-]{1,40}$'),
  libelle   text not null check (length(btrim(libelle)) > 0),
  ordre     integer not null default 0,
  -- Une entrée retirée est désactivée, jamais supprimée : des fiches y renvoient.
  actif     boolean not null default true,
  unique (categorie, cle)
);

comment on table referentiels is
  'Valeurs proposées pour les champs à choix multiple du profil apprenant (planche B, écran 04).';

comment on column referentiels.cle is
  'Identifiant stable stocké dans personas.reseaux, .outils, .canaux et .presence_en_ligne.';

insert into referentiels (id, categorie, cle, libelle, ordre) values
  ('ref-res-facebook',   'reseau', 'facebook',   'Facebook',      10),
  ('ref-res-instagram',  'reseau', 'instagram',  'Instagram',     20),
  ('ref-res-tiktok',     'reseau', 'tiktok',     'TikTok',        30),
  ('ref-res-whatsapp',   'reseau', 'whatsapp',   'WhatsApp',      40),
  ('ref-res-linkedin',   'reseau', 'linkedin',   'LinkedIn',      50),
  ('ref-res-youtube',    'reseau', 'youtube',    'YouTube',       60),
  ('ref-res-x',          'reseau', 'x',          'X (Twitter)',   70),
  ('ref-res-snapchat',   'reseau', 'snapchat',   'Snapchat',      80),
  ('ref-res-telegram',   'reseau', 'telegram',   'Telegram',      90),
  ('ref-res-pinterest',  'reseau', 'pinterest',  'Pinterest',    100),
  ('ref-res-threads',    'reseau', 'threads',    'Threads',      110),
  ('ref-res-site-web',   'reseau', 'site-web',   'Site web',     120),

  ('ref-out-canva',      'outil', 'canva',              'Canva',               10),
  ('ref-out-capcut',     'outil', 'capcut',             'CapCut',              20),
  ('ref-out-meta',       'outil', 'meta-business-suite','Meta Business Suite',  30),
  ('ref-out-chatgpt',    'outil', 'chatgpt',            'ChatGPT',             40),
  ('ref-out-photoshop',  'outil', 'photoshop',          'Photoshop',           50),
  ('ref-out-lightroom',  'outil', 'lightroom',          'Lightroom',           60),
  ('ref-out-premiere',   'outil', 'premiere-pro',       'Premiere Pro',        70),
  ('ref-out-figma',      'outil', 'figma',              'Figma',               80),
  ('ref-out-buffer',     'outil', 'buffer',             'Buffer',              90),
  ('ref-out-hootsuite',  'outil', 'hootsuite',          'Hootsuite',          100),
  ('ref-out-later',      'outil', 'later',              'Later',              110),
  ('ref-out-mailchimp',  'outil', 'mailchimp',          'Mailchimp',          120),
  ('ref-out-analytics',  'outil', 'google-analytics',   'Google Analytics',   130),
  ('ref-out-notion',     'outil', 'notion',             'Notion',             140),

  ('ref-can-whatsapp',   'canal', 'whatsapp',          'WhatsApp',           10),
  ('ref-can-boutique',   'canal', 'boutique-physique', 'Boutique physique',  20),
  ('ref-can-marche',     'canal', 'marche',            'Marché',             30),
  ('ref-can-reseaux',    'canal', 'reseaux-sociaux',   'Réseaux sociaux',    40),
  ('ref-can-site-web',   'canal', 'site-web',          'Site web',           50),
  ('ref-can-marketplace','canal', 'marketplace',       'Marketplace',        60),
  ('ref-can-bouche',     'canal', 'bouche-a-oreille',  'Bouche-à-oreille',   70),
  ('ref-can-demarchage', 'canal', 'demarchage',        'Démarchage direct',  80),
  ('ref-can-telephone',  'canal', 'telephone',         'Téléphone',          90),
  ('ref-can-livraison',  'canal', 'livraison',         'Livraison à domicile', 100);

-- ---------------------------------------------------------------------------
-- Reprise de l'existant
--
-- Les valeurs déjà saisies sont converties en clés : découpage sur la virgule,
-- puis appariement du libellé sans casse ni accent. Une valeur qu'aucune entrée
-- ne reconnaît est **conservée telle quelle** — elle restera affichée brute et
-- n'empêchera jamais l'enregistrement d'une fiche par ailleurs inchangée. Le
-- contraire reviendrait à effacer la réponse d'un apprenant au motif qu'elle
-- n'entre pas dans une liste écrite après coup.
-- ---------------------------------------------------------------------------

-- L'extension `unaccent` n'est pas garantie sur toutes les installations, et
-- PGlite ne l'embarque pas : un simple `translate` suffit pour les accents
-- rencontrés en pratique.
create or replace function pg_temp_sans_accent(valeur text)
returns text
language sql
immutable
as $$
  select translate(
    coalesce(valeur, ''),
    'àâäáãåçèéêëìíîïñòóôöõùúûüýÿÀÂÄÁÃÅÇÈÉÊËÌÍÎÏÑÒÓÔÖÕÙÚÛÜÝ',
    'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY'
  );
$$;

create or replace function pg_temp_cle(valeur text, cat categorie_referentiel)
returns text
language sql
stable
as $$
  select coalesce(
    (
      select r.cle
      from referentiels r
      where r.categorie = cat
        and lower(pg_temp_sans_accent(r.libelle)) = lower(pg_temp_sans_accent(btrim(valeur)))
      limit 1
    ),
    btrim(valeur)
  );
$$;

create or replace function pg_temp_cles(valeur text, cat categorie_referentiel)
returns text
language sql
stable
as $$
  select nullif(
    (
      select string_agg(distinct pg_temp_cle(morceau, cat), ',')
      from unnest(string_to_array(coalesce(valeur, ''), ',')) as morceau
      where btrim(morceau) <> ''
    ),
    ''
  );
$$;

update personas set
  reseaux           = pg_temp_cles(reseaux, 'reseau'),
  presence_en_ligne = pg_temp_cles(presence_en_ligne, 'reseau'),
  outils            = pg_temp_cles(outils, 'outil'),
  canaux            = pg_temp_cles(canaux, 'canal');

-- Ces fonctions n'ont servi qu'à la reprise.
drop function pg_temp_cles(text, categorie_referentiel);
drop function pg_temp_cle(text, categorie_referentiel);
drop function pg_temp_sans_accent(text);

-- ---------------------------------------------------------------------------
-- Sécurité : mêmes règles que les autres tables (accès serveur uniquement).
-- ---------------------------------------------------------------------------

alter table referentiels enable row level security;
revoke all on referentiels from anon, authenticated;
