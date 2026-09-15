-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — apprenant
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 11 sur 21 · source : 20260917120000_apprenant.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Planche B — espace apprenant
--
-- Les statuts d'une demande de coaching privé tels que la maquette 10 les
-- nomme (« En étude », « Expirée » manquaient), la réunion Zoom rattachée à
-- chaque session et à chaque séance privée (écran 11 : Meeting SDK intégré),
-- le montant d'une séance privée et la commande qui la règle (« Accepter et
-- payer »), et la confirmation d'identité avant la délivrance du certificat
-- (écran 05).
--
-- Les valeurs d'énumération ajoutées ici ne sont pas utilisées dans le même
-- fichier.
-- ---------------------------------------------------------------------------

alter type statut_coaching_prive add value if not exists 'en-etude';
alter type statut_coaching_prive add value if not exists 'expiree';

-- ---------------------------------------------------------------------------
-- 1. Réunions Zoom
-- ---------------------------------------------------------------------------

alter table sessions_coaching
  add column zoom_reunion_id        text,
  add column zoom_mot_de_passe      text,
  add column zoom_lien_participation text,
  add column zoom_lien_hote         text;

comment on column sessions_coaching.zoom_reunion_id is
  'Identifiant de la réunion Zoom créée à la planification (Server-to-Server OAuth). Vide en mode simulation.';
comment on column sessions_coaching.zoom_lien_participation is
  'Lien de secours « Ouvrir dans l''application Zoom » : jamais affiché en clair avant l''ouverture de la salle.';

alter table demandes_coaching_prive
  add column zoom_reunion_id      text,
  add column zoom_mot_de_passe    text,
  add column evenement_agenda_id  text,
  add column montant_fcfa         integer;

comment on column demandes_coaching_prive.evenement_agenda_id is
  'Événement Google Agenda créé après paiement (planche C, écran 05 ; planche D, écran 05).';
comment on column demandes_coaching_prive.montant_fcfa is
  'Montant proposé par l''équipe (heures × tarif horaire), affiché avec le créneau proposé.';

-- Présence pointée par participant (« Vous avez participé ✓ · compte pour
-- votre certificat », planche B, écran 08). `sessions_coaching.presents`
-- reste le total relevé par l'équipe.
alter table inscriptions_sessions
  add column present boolean;

-- ---------------------------------------------------------------------------
-- 2. « Accepter et payer » : une commande peut régler une séance privée
-- ---------------------------------------------------------------------------

alter table commandes
  add column demande_coaching_id text references demandes_coaching_prive (id) on delete set null on update cascade;

create index commandes_demande_coaching_idx on commandes (demande_coaching_id) where demande_coaching_id is not null;

-- ---------------------------------------------------------------------------
-- 3. Certificat : identité confirmée avant génération (écran 05)
-- ---------------------------------------------------------------------------

alter table certificats
  add column prenom_nom_confirme_le timestamptz;
