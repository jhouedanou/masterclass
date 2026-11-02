-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — formateur linkedin presentation
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 51 sur 51 · source : 20261102130000_formateur_linkedin_presentation.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Fiche formateur : présentation et LinkedIn (brief du 02/11)
--
-- La nouvelle maquette sépare une présentation courte, en tête de fiche, de
-- la biographie (`bio`, déjà en place), et ajoute le lien LinkedIn. Les deux
-- sont facultatifs : une fiche sans eux s'affiche comme avant.
-- ---------------------------------------------------------------------------

alter table formateurs
  add column presentation text not null default '',
  add column linkedin text
    check (linkedin is null or linkedin ~ '^https://([a-z]{2,3}\.)?(www\.)?linkedin\.com/');

comment on column formateurs.presentation is 'Présentation courte, en tête de la fiche publique.';
comment on column formateurs.linkedin is 'Profil LinkedIn public (https://…linkedin.com/…).';
