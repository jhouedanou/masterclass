-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — live sessions enums
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 48 sur 51 · source : 20261030120000_live_sessions_enums.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Live Session (CDC v1.3, §3) : valeurs d'enum
--
-- Une valeur ajoutée par `alter type … add value` ne peut pas servir dans la
-- transaction qui la crée : les tables et fonctions qui s'en servent sont dans
-- la migration suivante (…_live_sessions.sql).
--
-- Correspondance avec les statuts du CDC, sans renommer ceux qui existent :
-- « À venir » (soon) = `annonce`, avec `date_lancement` pour available_on ;
-- « Live Session » (live) = `live-session` ; « Disponible » (available) =
-- `disponible`.
-- ---------------------------------------------------------------------------

alter type statut_module add value if not exists 'live-session';

-- Back-office Live Sessions : rôle admin (CDC 10.F), section propre pour
-- qu'un admin-contenu puisse la recevoir sans le calendrier des coachings.
alter type section_admin add value if not exists 'live-sessions';

create type statut_session_live as enum ('brouillon', 'publiee', 'en-cours', 'terminee', 'annulee');

create type statut_inscription_live as enum ('attente', 'confirmee', 'expiree', 'annulee', 'a-rembourser');

-- Réglage live_sessions_visibility (CDC 10.G) : off | admins | all.
create type visibilite_live as enum ('personne', 'admins', 'tous');
