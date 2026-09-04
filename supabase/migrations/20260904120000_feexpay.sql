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
