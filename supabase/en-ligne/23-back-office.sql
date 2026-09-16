-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — back office
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 23 sur 27 · source : 20260926120000_back_office.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Back-office — planche C, écrans 01 à 02B
--
-- Trois manques que la planche C suppose acquis :
--
--   1. Un programme a un statut de publication. L'écran 02 le montre à côté du
--      nom ; sans lui, l'arbre affiche « Publiée » en dur.
--   2. Un module peut être « prêt » — relu, complet, filmé — sans être en
--      vente. L'écran 09 en fait un bouton et l'écran 02 un badge distinct du
--      badge commercial.
--   3. Les thématiques se réordonnent à la main (écran 02, glisser-déposer).
--      `numero` faisait jusqu'ici office d'ordre et de numéro affiché ; deux
--      thématiques ne pouvaient donc pas échanger leur place sans collision.
--
-- « Prêt » est une colonne et non une valeur de `statut_module`. PostgreSQL
-- refuse d'employer une valeur d'énumération dans la transaction qui l'a
-- créée : le fichier régénéré par `npm run db:sql` échouerait dans l'éditeur
-- SQL en ligne, qui joue tout d'un bloc. Une colonne évite le piège, laisse
-- intacts `modules_programme_statut_idx` et le filtre public
-- `statut = 'disponible'`, et sait dire « brouillon ET prêt », ce que
-- l'énumération ne peut pas exprimer.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Statut de publication d'un programme
-- ---------------------------------------------------------------------------

alter table programmes
  add column statut statut_publication not null default 'publie';

comment on column programmes.statut is
  'Publication du programme (planche C, écran 02). Les deux programmes livrés sont publiés ; un programme en brouillon disparaît du site public.';

-- ---------------------------------------------------------------------------
-- 2. Module « Prêt » — pédagogiquement complet, commercialement indépendant
-- ---------------------------------------------------------------------------

alter table modules
  add column pret_le timestamptz;

comment on column modules.pret_le is
  'Horodatage du « Marquer Prêt » (écran 09). Distinct de publie_le : prêt signifie filmé, transcrit et relu, pas encore en vente. Remis à null dès qu''un contenu du module ou d''un de ses chapitres change — sinon la pastille ment.';

-- ---------------------------------------------------------------------------
-- 3. Ordre des thématiques, distinct de leur numéro d'affichage
--
-- Sans colonne dédiée, réordonner revient à permuter `numero`, qui est aussi
-- ce que lit la fiche publique : deux thématiques ne pouvaient pas échanger
-- leur place sans passer par une valeur intermédiaire.
-- ---------------------------------------------------------------------------

alter table thematiques
  add column position integer;

update thematiques t
   set position = c.rang - 1
  from (
    select id, row_number() over (partition by programme order by numero, id) as rang
      from thematiques
  ) c
 where c.id = t.id;

alter table thematiques
  alter column position set not null,
  alter column position set default 0;

create index thematiques_ordre_idx on thematiques (phase_id, position);

comment on column thematiques.position is
  'Ordre d''affichage dans la phase, piloté par le glisser-déposer de l''écran 02. Distinct de `numero`, qui reste le numéro montré à l''apprenant.';
