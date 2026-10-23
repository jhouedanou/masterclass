-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — transaction coaching prive
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 38 sur 47 · source : 20261015120100_transaction_coaching_prive.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Le paiement d'une séance de coaching privé est une transaction
--
-- « Accepter et payer » ouvre une commande sans module (`demande_coaching_id`)
-- et FeexPay l'encaisse comme une autre. Mais la transaction, elle, exigeait un
-- module : aucune ligne n'était créée, et ces paiements manquaient à l'écran
-- Transactions, aux revenus et au rapprochement avec le relevé FeexPay
-- (recette du 15/10, PRI-08).
--
-- `module_id` devient facultatif : vide, la transaction règle la séance que
-- désigne sa commande. L'index d'unicité de la référence prestataire passe en
-- `nulls not distinct`, sans quoi deux lignes sans module pourraient porter
-- le même paiement FeexPay.
-- ---------------------------------------------------------------------------

alter table transactions alter column module_id drop not null;

drop index if exists transactions_prestataire_idx;
create unique index transactions_prestataire_idx
  on transactions (reference_prestataire, module_id) nulls not distinct
  where reference_prestataire is not null;

comment on column transactions.module_id is
  'Module réglé. Vide pour une séance de coaching privé : la commande porte alors demande_coaching_id.';

-- Rattrapage : une transaction pour chaque commande de coaching déjà ouverte,
-- dans l'état de sa commande. Le motif d'un échec passé n'a pas été gardé.
insert into transactions (
  reference, utilisateur_id, module_id, moyen, montant, statut, code_echec,
  date_transaction, cree_le, commande_reference
)
select
  c.reference || '-coaching',
  c.utilisateur_id,
  null,
  (case c.moyen
     when 'wave' then 'Wave'
     when 'djamo' then 'Djamo'
     when 'visa' then 'Visa'
     else 'Orange Money'
   end)::moyen_transaction,
  c.total,
  (case c.statut
     when 'confirmee' then 'reussie'
     when 'echec' then 'echouee'
     else 'en-attente'
   end)::statut_transaction,
  case when c.statut = 'echec' then 'erreur-inconnue'::code_echec_paiement end,
  c.creee_le::date,
  c.creee_le,
  c.reference
from commandes c
where c.demande_coaching_id is not null
  and not exists (select 1 from transactions t where t.commande_reference = c.reference);
