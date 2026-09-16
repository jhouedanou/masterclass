-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — feexpay
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 8 sur 27 · source : 20260904120000_feexpay.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Branchement FeexPay
--
-- La transaction porte désormais la commande qu'elle règle, la référence
-- attribuée par le prestataire (celle qu'on interroge pour vérifier le
-- paiement et que renvoie le webhook) et le réseau exact restitué par FeexPay
-- (« ORANGE CI », « WAVE CI »…), l'énumération `moyen` n'en gardant que la
-- famille.
-- ---------------------------------------------------------------------------

alter table transactions
  add column commande_reference    text references commandes (reference) on delete set null on update cascade,
  add column reference_prestataire text,
  add column reseau                text;

create index transactions_commande_idx on transactions (commande_reference);
create unique index transactions_prestataire_idx
  on transactions (reference_prestataire, module_id)
  where reference_prestataire is not null;
