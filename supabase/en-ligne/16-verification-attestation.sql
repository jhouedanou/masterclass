-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — verification attestation
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 16 sur 27 · source : 20260921120100_verification_attestation.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Vérification publique des attestations
--
-- Deux manques de la page /verifier, cible du QR code imprimé sur le document.
--
-- 1. La révocation. Une attestation délivrée par erreur restait authentique à
--    vie : rien ne permettait de la retirer. Les colonnes reprennent les noms
--    déjà employés pour un accès révoqué (`acces.revoque_le`,
--    `acces.motif_revocation`), pour que les deux se lisent pareil.
--
-- 2. Le balayage des numéros. Ils sont tirés d'une séquence
--    (`EMBF-ENT-2026-000128` puis `…000129`) : qui en connaît un les devine
--    tous, et pouvait donc récolter le nom des apprenants un par un. Le
--    comptage des consultations permet à la route publique de refuser une
--    adresse qui essaie des numéros au hasard.
--
--    Le comptage est en base et non en mémoire : sur un hébergement sans
--    processus permanent (Vercel), chaque requête peut tomber sur une instance
--    neuve, et un compteur en RAM serait remis à zéro en permanence. C'est le
--    même choix que pour les tentatives de connexion, comptées dans
--    `connexions`.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Révocation d'une attestation
-- ---------------------------------------------------------------------------

alter table certificats
  add column revoque_le       timestamptz,
  add column motif_revocation text;

comment on column certificats.revoque_le is
  'Attestation annulée par l''administration : la page publique de vérification la déclare non valable.';
comment on column certificats.motif_revocation is
  'Motif de la révocation, obligatoire. Interne : la page publique ne le divulgue pas.';

-- ---------------------------------------------------------------------------
-- 2. Consultations de la page de vérification
-- ---------------------------------------------------------------------------

create table tentatives_verification (
  id      uuid primary key default gen_random_uuid(),
  ip      text not null,
  numero  text not null,
  -- Un vérificateur légitime lit un numéro qu'il a sous les yeux ; un balayeur
  -- tombe presque toujours à côté. Distinguer les deux évite de pénaliser
  -- l'employeur qui contrôle plusieurs attestations d'affilée.
  trouve  boolean not null,
  cree_le timestamptz not null default now()
);

comment on table tentatives_verification is
  'Consultations de /verifier, pour refuser le balayage des numéros séquentiels. Purgée à 24 h par la tâche de nuit.';

create index tentatives_verification_ip_idx on tentatives_verification (ip, cree_le desc);

-- ---------------------------------------------------------------------------
-- Sécurité : mêmes règles que les autres tables (accès serveur uniquement).
-- ---------------------------------------------------------------------------

alter table tentatives_verification enable row level security;
revoke all on tentatives_verification from anon, authenticated;
