-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — fermer lecture publique
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 37 sur 38 · source : 20261015120000_fermer_lecture_publique.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Aucun droit pour les clés publiques, sur toutes les tables
--
-- Chaque migration retirait à la main les droits `anon` et `authenticated` de
-- ses propres tables. Deux y ont échappé : `visionnages` (06) et
-- `reglages_attestation` (34). La recette du 15/10 l'a relevé (SEC-09) : avec
-- la clé publique, 43 tables sur 45 répondent 401, ces deux-là 200 et vide.
-- RLS filtrait tout, aucune donnée n'est sortie, mais le droit de lecture
-- restait ouvert là où il est fermé partout ailleurs.
--
-- Plutôt qu'une liste de plus, une passe sur tout le schéma : RLS activé et
-- droits retirés, quelle que soit la table. Puis les privilèges par défaut,
-- pour qu'une table créée demain naisse fermée au lieu d'attendre qu'on pense
-- à elle. La plateforme ne lit la base que par Nitro avec la clé secrète
-- (voir 20260828120200_securite_rls.sql) : rien ne dépend de ces droits.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end;
$$;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
