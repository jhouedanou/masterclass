-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — photo alt formateur
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 18 sur 32 · source : 20260922090000_photo_alt_formateur.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- Texte alternatif du portrait des formateurs (annexe technique, planche A
-- écran 14). Vide, l'affichage retombe sur un libellé construit sur le nom.

alter table formateurs add column if not exists photo_alt text;

comment on column formateurs.photo_alt is
  'Texte alternatif du portrait, éditable au back-office. Vide, un libellé construit sur le nom prend le relais.';
