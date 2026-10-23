-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — session mensuelle
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 36 sur 47 · source : 20261013120000_session_mensuelle.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Une session collective par couple thématique–formateur et par mois
--
-- Le modèle économique prévoit une séance mensuelle de deux heures par couple
-- thématique–formateur. L'index d'origine ne portait que « une session par
-- thématique et par date » : rien n'empêchait d'en planifier une le 12 et une
-- autre le 27 pour le même couple, ce que la recette du 13/10 a relevé
-- (COL-01).
--
-- `date_seance` est une date : la convertir en timestamp sans fuseau garde
-- `date_trunc` immuable, condition pour figurer dans un index. Les sessions
-- annulées restent hors de la règle, comme avant : annuler puis replanifier
-- dans le même mois reste possible.
--
-- La base hébergée doit être purgée de ses doublons avant d'appliquer ce
-- fichier, sans quoi la création de l'index échoue :
--
--   select thematique_id, formateur_id, date_trunc('month', date_seance::timestamp) as mois,
--          array_agg(id order by date_seance) as sessions
--     from sessions_coaching
--    where statut <> 'annulee'
--    group by 1, 2, 3
--   having count(*) > 1;
-- ---------------------------------------------------------------------------

drop index if exists sessions_coaching_thematique_date_idx;

create unique index sessions_coaching_couple_mois_idx
  on sessions_coaching (thematique_id, formateur_id, date_trunc('month', date_seance::timestamp))
  where statut <> 'annulee';

comment on index sessions_coaching_couple_mois_idx is
  'Une seule session par couple thématique–formateur et par mois, annulations exclues.';
