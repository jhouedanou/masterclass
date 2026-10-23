-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — sections apprenants attestations
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 42 sur 47 · source : 20261020200000_sections_apprenants_attestations.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- Back-office : deux sections de plus, « Apprenants » et « Attestations ».
--
-- L'audit du 20/10 a relevé des routes d'administration gardées par le seul
-- rôle : n'importe quel administrateur de contenu, quelles que soient les
-- sections cochées pour lui, pouvait lire la liste des apprenants et leurs
-- coordonnées, créer un compte, révoquer ou rétablir un accès, et révoquer une
-- attestation. Ces écrans ne relevaient d'aucune section existante.
--
-- Aucune section n'est accordée d'office aux comptes existants : un
-- administrateur supérieur les coche explicitement, comme les autres. Les
-- administrateurs supérieurs, eux, voient tout sans section.
--
-- `add value` ne peut pas être employé dans la transaction qui l'ajoute : rien
-- d'autre ici ne s'en sert.

alter type section_admin add value if not exists 'apprenants';
alter type section_admin add value if not exists 'attestations';
