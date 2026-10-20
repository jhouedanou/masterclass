-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — sous titres chapitre
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 39 sur 44 · source : 20261020120000_sous_titres_chapitre.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- Sous-titres des chapitres.
--
-- Les vidéos livrées par Big Five arrivent avec leurs sous-titres WebVTT,
-- déposés à côté du flux, dans le même dossier du stockage
-- (`<video_cle>/sous-titres.vtt`) : la signature de lecture, qui porte sur le
-- dossier, les ouvre donc sans autorisation de plus. Cette colonne dit
-- seulement au lecteur qu'il peut les demander, plutôt que d'essuyer une 404 sur
-- chaque chapitre qui n'en a pas.

alter table chapitres
  add column sous_titres boolean not null default false;

comment on column chapitres.sous_titres is
  'Vrai quand <video_cle>/sous-titres.vtt existe dans le stockage vidéo.';
