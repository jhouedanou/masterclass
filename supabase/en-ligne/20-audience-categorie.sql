-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — audience categorie
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 20 sur 30 · source : 20260923120000_audience_categorie.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Quatrième catégorie de référentiel : les tranches d'audience
--
-- La taille d'audience était un choix unique pour toute la fiche, alors qu'un
-- apprenant qui gère cinq réseaux n'a pas la même audience sur chacun. Elle
-- devient une valeur par réseau — voir la migration suivante, qui pose les
-- entrées et convertit l'existant.
--
-- L'ajout de la valeur d'enum est isolé dans son propre fichier : PostgreSQL
-- refuse d'employer une valeur d'énumération dans la transaction qui l'ajoute.
-- Les deux fichiers doivent donc être exécutés séparément.
-- ---------------------------------------------------------------------------

alter type categorie_referentiel add value if not exists 'audience';
