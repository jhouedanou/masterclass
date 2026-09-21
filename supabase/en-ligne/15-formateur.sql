-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — formateur
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 15 sur 31 · source : 20260921120000_formateur.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Planche D — espace formateur
--
-- Le profil de la maquette (écran 02) porte deux coordonnées que la fiche
-- publique n'affiche pas : l'e-mail professionnel et le numéro WhatsApp. Ils
-- servent à joindre le formateur — jamais l'apprenant, dont les coordonnées
-- restent masquées (écran 04).
--
-- Les sujets soumis avant une session sont « à lire » tant que le formateur
-- ne les a pas ouverts : c'est le compteur « Sujets à lire avant le 10/09 »
-- du bloc « À traiter » (écran 01).
--
-- Enfin, un formateur simple peut demander l'activation du coaching privé
-- (écran 05, état verrouillé). La demande est horodatée sur sa fiche :
-- l'activation elle-même reste du ressort de l'équipe.
-- ---------------------------------------------------------------------------

alter table formateurs
  add column email_pro text not null default '',
  add column whatsapp  text not null default '',
  add column activation_coaching_demandee_le timestamptz;

comment on column formateurs.email_pro is
  'Adresse professionnelle du formateur, interne à la plateforme : la fiche publique /formateurs ne l''affiche pas.';
comment on column formateurs.whatsapp is
  'Numéro WhatsApp du formateur, pour les notifications sortantes de l''équipe.';
comment on column formateurs.activation_coaching_demandee_le is
  'Horodatage du bouton « Demander l''activation à l''équipe » (planche D, écran 05). L''activation reste posée par l''administration.';

-- Les sujets soumis pour une session : « 19 sujets → » puis « Sujets à lire
-- avant le 10/09 : 19 ». Ouvrir la liste marque la lecture.
alter table sujets_sessions
  add column lu_le timestamptz;

comment on column sujets_sessions.lu_le is
  'Date à laquelle le formateur a ouvert la liste des sujets de la session. Vide tant qu''il ne les a pas lus.';

create index sujets_sessions_non_lus_idx on sujets_sessions (session_id) where lu_le is null;

-- L'événement Google Agenda d'une séance privée est déjà porté par
-- demandes_coaching_prive.evenement_agenda_id (migration 11). Les sessions
-- collectives, planifiées par l'équipe, en reçoivent un à leur tour.
alter table sessions_coaching
  add column evenement_agenda_id text;

comment on column sessions_coaching.evenement_agenda_id is
  'Événement Google Agenda de la session collective, créé à la planification (rappels 24 h et 1 h). Vide en mode simulation.';
