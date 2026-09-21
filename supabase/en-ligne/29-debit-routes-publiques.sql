-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — debit routes publiques
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 29 sur 33 · source : 20261001120000_debit_routes_publiques.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Limitation de débit des routes publiques
--
-- Cinq routes ouvertes à tous n'avaient aucun plafond : inscription, mot de
-- passe oublié, formulaire de contact, candidature formateur et alerte de
-- lancement. Chacune écrit en base, l'inscription calcule en plus un scrypt de
-- 16 Mo, et le contact déclenche deux envois d'e-mail dont un vers une adresse
-- fournie par l'appelant.
--
-- Le verrou de connexion, lui, compte par compte (`connexions`) : il ne couvre
-- pas ces routes, où il n'y a pas toujours de compte. On compte donc par
-- adresse, comme `tentatives_verification` le fait déjà pour la page de
-- vérification d'attestation — même forme, même purge de nuit.
-- ---------------------------------------------------------------------------

create table tentatives_publiques (
  id      uuid primary key default gen_random_uuid(),
  ip      text not null,
  -- Le nom logique de la route, pas son chemin : « inscription », « contact »…
  -- Chaque route a son propre plafond, d'où le comptage séparé.
  route   text not null,
  cree_le timestamptz not null default now()
);

comment on table tentatives_publiques is
  'Appels aux routes publiques d''écriture, pour en plafonner le débit par adresse. Purgée à 24 h par la tâche de nuit.';

create index tentatives_publiques_ip_route_idx
  on tentatives_publiques (ip, route, cree_le desc);

-- ---------------------------------------------------------------------------
-- Sécurité : mêmes règles que les autres tables (accès serveur uniquement).
-- ---------------------------------------------------------------------------

alter table tentatives_publiques enable row level security;
revoke all on tentatives_publiques from anon, authenticated;
