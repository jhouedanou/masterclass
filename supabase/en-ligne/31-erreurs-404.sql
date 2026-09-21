-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — erreurs 404
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 31 sur 31 · source : 20261003120000_erreurs_404.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Erreurs 404 (planche C, écran 23 — bloc « État technique »)
--
-- La maquette y attend cinq lignes chiffrées, dont « Erreurs 404 (30 j) ».
-- Aucune table ne les journalisait : l'écran affichait un tiret.
--
-- Le comptage ne peut pas venir de `server/middleware/redirections.ts`, qui
-- s'exécute avant le routage et ignore si le chemin aboutira. Il vient d'un
-- greffon Nitro accroché à la réponse, qui incrémente la ligne du chemin dès
-- qu'un statut 404 part.
--
-- Une ligne par chemin, pas une par visite : ce qui intéresse l'équipe, c'est
-- quelle URL casse et depuis quand, pas le volume de robots.
-- ---------------------------------------------------------------------------

create table if not exists erreurs_404 (
  chemin      text primary key,
  vues        integer not null default 1 check (vues > 0),
  premiere_le timestamptz not null default now(),
  derniere_le timestamptz not null default now()
);

comment on table erreurs_404 is
  'Chemins publics ayant répondu 404, comptés par chemin. Alimente « Erreurs 404 (30 j) » de l''écran 23. Purge libre : seule la fenêtre de 30 jours est lue.';

create index if not exists erreurs_404_derniere_idx on erreurs_404 (derniere_le desc);

-- Incrément atomique : deux visiteurs simultanés sur la même URL cassée ne
-- doivent pas se perdre l'un l'autre.
create or replace function enregistrer_erreur_404(p_chemin text)
returns void
language sql
as $$
  insert into erreurs_404 (chemin) values (p_chemin)
  on conflict (chemin) do update
    set vues = erreurs_404.vues + 1,
        derniere_le = now();
$$;
