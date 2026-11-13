-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — recette resultats
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 52 sur 52 · source : 20261113200000_recette_resultats.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Recette partagée (écran /admin/recette)
--
-- Chaque testeur marque chaque contrôle OK, KO ou passé, avec une note. Une
-- ligne par contrôle et par testeur : tout le monde voit les résultats des
-- autres, personne n'écrase ceux d'un autre.
--
-- La liste des contrôles vit dans le code (`server/data/recette.json`) : elle
-- change à chaque livraison, et la tenir en base obligerait à une migration
-- par campagne. La table ne porte donc que les résultats, rattachés à un
-- contrôle par sa clé (« 1.4 »). Une clé retirée du fichier laisse des lignes
-- orphelines, que l'écran ignore.
-- ---------------------------------------------------------------------------

create table if not exists recette_resultats (
  controle   text not null check (char_length(controle) between 1 and 20),
  testeur_id text not null references utilisateurs(id) on delete cascade,
  statut     text not null check (statut in ('ok', 'ko', 'passe')),
  note       text not null default '' check (char_length(note) <= 1000),
  maj_le     timestamptz not null default now(),
  primary key (controle, testeur_id)
);

comment on table recette_resultats is
  'Résultats de la recette partagée (/admin/recette) : un par contrôle et par testeur. Les contrôles sont décrits dans server/data/recette.json.';

create index if not exists recette_resultats_testeur_idx on recette_resultats (testeur_id);

-- Même posture que le reste du schéma : lecture et écriture par le serveur
-- applicatif seulement, la clé publique ne voit rien.
alter table recette_resultats enable row level security;
revoke all on recette_resultats from anon, authenticated;
