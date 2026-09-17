-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — revocation visionnage
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 28 sur 30 · source : 20260930120000_revocation_visionnage.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Révocation de `enregistrer_visionnage`
--
-- La sécurité au niveau des lignes est activée sur toutes les tables sans
-- aucune politique : la clé publiable (`anon`) ne doit rien pouvoir faire, et
-- l'application écrit avec la clé secrète depuis Nitro.
--
-- `enregistrer_visionnage` est `security definer` — elle s'exécute avec les
-- droits de son propriétaire et contourne donc ce verrou. Or PostgreSQL accorde
-- `execute` à `public` par défaut sur toute fonction créée : contrairement aux
-- cinq autres fonctions métier du schéma, celle-ci n'avait jamais été révoquée.
-- Elle restait appelable en RPC avec la clé publiable, et son paramètre
-- `p_utilisateur_id` permettait d'écrire un visionnage au nom d'un tiers, ou de
-- savoir si tel compte possède tel module.
--
-- Même traitement que `reserver_place_session`, `delivrer_certificat`,
-- `attribuer_acces`, `enregistrer_tentative_connexion` et
-- `compter_echecs_connexion`.
-- ---------------------------------------------------------------------------

revoke execute on function
  public.enregistrer_visionnage(text, uuid, integer)
  from anon, authenticated, public;

grant execute on function
  public.enregistrer_visionnage(text, uuid, integer)
  to service_role;
