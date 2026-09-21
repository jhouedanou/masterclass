-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — signatures attestation
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 34 sur 34 · source : 20261006120000_signatures_attestation.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Griffes des attestations
--
-- Le pied du document prévoyait une signature manuscrite, servie depuis
-- `/images/brand/signature.png` — un fichier du dépôt, jamais fourni. La page
-- de l'attestation portait donc un `@error` pour retomber sur une ligne vide,
-- et personne ne pouvait y remédier sans un déploiement.
--
-- Les griffes deviennent des données. Deux, comme un diplôme : celle du
-- formateur qui a donné le module, et celle de la direction qui le délivre.
--
-- Elles ne sont pas figées dans le certificat au moment où il est généré, et
-- c'est délibéré. Aucune griffe n'est déposée aujourd'hui : les figer
-- laisserait toutes les attestations déjà délivrées non signées à jamais, sans
-- autre recours que de les régénérer. Elles sont donc résolues à l'affichage,
-- le certificat gardant ce qui l'identifie — nom, module, dates, numéro.
--
-- Ce que la colonne garde est une adresse publique, et non un chemin dans le
-- seau : c'est la convention déjà suivie par `formateurs.photo`, dont les
-- lignes du seed pointent vers des fichiers du site.
-- ---------------------------------------------------------------------------

create table reglages_attestation (
  id              boolean primary key default true check (id),
  -- Vide tant que la direction n'a rien déposé : le pied retombe alors sur sa
  -- ligne de signature nue, exactement comme aujourd'hui.
  signature       text not null default '',
  -- La légende sous la ligne. Écrite en dur dans le gabarit jusqu'ici, elle
  -- passe ici pour que le nom de la direction se change sans déploiement.
  signataire      text not null default 'Direction E-Masterclass Big Five',
  maj_le          timestamptz not null default now()
);

insert into reglages_attestation (id) values (true);

-- Griffe propre au formateur. `null` et non `''` : la photo, elle, est
-- obligatoire et porte une valeur de repli ; une signature absente est un état
-- normal et durable, que le pied de page doit pouvoir distinguer.
alter table formateurs add column signature text;

comment on table reglages_attestation is
  'Griffe et légende de la direction au pied des attestations. Une seule ligne, comme reglages_financiers.';
comment on column formateurs.signature is
  'Adresse publique de la griffe du formateur, apposée sur les attestations de ses modules. Nulle tant qu''il n''a pas signé.';
