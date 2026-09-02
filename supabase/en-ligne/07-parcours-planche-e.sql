-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — parcours planche e
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 7 sur 7 · source : 20260903120000_parcours_planche_e.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Parcours de la planche E — coaching privé, compte apprenant, recrutement
-- des formateurs, échecs de paiement
--
-- La planche E (diagramme des parcours) trace six parcours qui traversent les
-- quatre espaces. Trois d'entre eux n'avaient jusqu'ici que des écrans en
-- lecture : la demande de coaching privé côté apprenant, son traitement côté
-- admin et l'activation d'un formateur. Cette migration pose ce qui manque en
-- base pour les fermer ; les écrans suivent dans le code applicatif.
--
-- Les valeurs d'énumération ajoutées ici ne sont pas utilisées dans le même
-- fichier : PostgreSQL refuse d'employer une valeur ajoutée dans la
-- transaction qui l'a créée.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Coaching privé
--
-- Le parcours 03 de la planche E : questions obligatoires, choix du formateur
-- et des créneaux (B-06), traitement par l'équipe (C-05), séance planifiée
-- pour le formateur (D-05), suivi daté et notation (B-10).
-- ---------------------------------------------------------------------------

alter type statut_coaching_prive add value if not exists 'refusee';
alter type statut_coaching_prive add value if not exists 'annulee';

alter table demandes_coaching_prive
  -- Le formateur est choisi par l'apprenant parmi ceux dont le coaching privé
  -- est activé ; il ne se déduit plus du module.
  add column formateur_id      text references formateurs (id) on update cascade,
  -- Jusqu'à trois créneaux proposés : [{ "date": "2026-09-12", "debut": "10:00", "fin": "12:00" }].
  add column creneaux          jsonb not null default '[]'::jsonb,
  add column creneau_retenu_le timestamptz,
  add column lien_session      text,
  add column motif_refus       text;

-- Les demandes existantes suivent le formateur du module concerné.
update demandes_coaching_prive d
   set formateur_id = m.formateur_id
  from modules m
 where m.id = d.module_id
   and d.formateur_id is null;

alter table demandes_coaching_prive
  alter column formateur_id set not null;

alter table demandes_coaching_prive
  add constraint demandes_coaching_prive_creneaux_tableau
    check (jsonb_typeof(creneaux) = 'array' and jsonb_array_length(creneaux) <= 3);

create index demandes_coaching_prive_utilisateur_idx on demandes_coaching_prive (utilisateur_id, recue_le desc);
create index demandes_coaching_prive_formateur_idx on demandes_coaching_prive (formateur_id, recue_le desc);

comment on column demandes_coaching_prive.formateur_id is
  'Formateur choisi par l''apprenant parmi ceux dont le coaching privé est activé.';
comment on column demandes_coaching_prive.creneaux is
  'Créneaux proposés par l''apprenant (3 au plus). Le créneau retenu est recopié dans `creneau`.';
comment on column demandes_coaching_prive.lien_session is
  'Lien de la séance (Zoom), posé par l''équipe une fois la demande payée.';

-- Suivi daté : chaque changement de statut laisse une trace lisible par
-- l'apprenant, l'équipe et le formateur. Écrit par le dépôt applicatif, pas par
-- un déclencheur — l'auteur n'est connu que de l'application.
create table historique_coaching_prive (
  id          uuid primary key default gen_random_uuid(),
  demande_id  text not null references demandes_coaching_prive (id) on delete cascade on update cascade,
  statut      statut_coaching_prive not null,
  auteur      text not null,
  commentaire text,
  cree_le     timestamptz not null default now()
);

create index historique_coaching_prive_demande_idx on historique_coaching_prive (demande_id, cree_le);

comment on table historique_coaching_prive is
  'Suivi daté d''une demande de coaching privé (planche B, écran 10). Une ligne par changement de statut.';

-- Les demandes déjà en base reçoivent une première trace, à leur date de
-- réception, pour que le suivi ne commence pas vide.
insert into historique_coaching_prive (demande_id, statut, auteur, cree_le)
select id, 'en-attente', apprenant, recue_le::timestamptz
  from demandes_coaching_prive;

-- ---------------------------------------------------------------------------
-- 2. Formateur « simple » ou « avec coaching privé »
--
-- Planche D, écran 05 : la section est verrouillée par défaut et ouverte par
-- l'administration (C-07b). Seuls les formateurs actifs apparaissent dans la
-- demande de l'apprenant.
-- ---------------------------------------------------------------------------

alter table formateurs
  add column coaching_prive_actif boolean not null default false;

comment on column formateurs.coaching_prive_actif is
  'Accès « Formateur avec coaching privé ». Faux par défaut ; activé et désactivé par l''administration, action journalisée.';

-- ---------------------------------------------------------------------------
-- 3. Candidatures → compte formateur
--
-- Parcours 06 : formulaire public (A-06), étude (C-11), création du compte
-- (C-07b). L'e-mail devient nécessaire pour inviter le candidat retenu.
-- ---------------------------------------------------------------------------

alter type statut_candidature add value if not exists 'acceptee';

alter table candidatures_formateurs
  add column email        text,
  add column traitee_le   timestamptz,
  add column formateur_id text references formateurs (id) on update cascade;

comment on column candidatures_formateurs.formateur_id is
  'Fiche formateur créée à partir de cette candidature, une fois acceptée.';

-- ---------------------------------------------------------------------------
-- 4. Compte apprenant : préférences de notification et suppression
--
-- Planche B, écrans 11 et 12. La suppression est douce : le compte cesse
-- d'exister pour l'apprenant (connexion impossible, e-mail libéré), mais les
-- commandes, transactions et certificats restent rattachés pour la
-- comptabilité.
-- ---------------------------------------------------------------------------

alter table utilisateurs
  add column preferences_notifications jsonb not null
    default '{"email": true, "whatsapp": true, "rappelsSessions": true, "nouveautes": false}'::jsonb,
  add column supprime_le timestamptz;

create index utilisateurs_actifs_idx on utilisateurs (id) where supprime_le is null;

comment on column utilisateurs.supprime_le is
  'Suppression douce demandée par l''apprenant. Un compte supprimé ne peut plus se connecter ; ses données financières sont conservées.';

-- ---------------------------------------------------------------------------
-- 5. Échecs de paiement
--
-- Planche A, écran 04c (six cas d'erreur du tunnel) et planche C, écran 18f
-- (suivi des échecs). Le code est posé par l'API à partir de la réponse du
-- prestataire ; tant que FeexPay n'est pas branché, il est simulé en
-- développement.
-- ---------------------------------------------------------------------------

create type code_echec_paiement as enum (
  'solde-insuffisant',
  'annule-utilisateur',
  'delai-depasse',
  'reseau-operateur',
  'carte-refusee',
  'erreur-inconnue'
);

alter table transactions
  add column code_echec   code_echec_paiement,
  add column detail_echec text;

alter table transactions
  add constraint transactions_echec_coherent
    check (code_echec is null or statut = 'echouee');

create index transactions_statut_idx on transactions (statut, date_transaction desc);

-- ---------------------------------------------------------------------------
-- Sécurité : mêmes règles que les autres tables (accès serveur uniquement).
-- ---------------------------------------------------------------------------

alter table historique_coaching_prive enable row level security;
revoke all on historique_coaching_prive from anon, authenticated;
