-- ---------------------------------------------------------------------------
-- Contexte Meta d'une commande (API Conversions)
--
-- Le paiement se confirme souvent loin du navigateur : webhook FeexPay ou
-- tâche de relance, parfois des minutes après que le client a validé sur son
-- téléphone. Pour que l'événement Purchase envoyé alors par le serveur soit
-- rattaché au bon visiteur, la commande garde ce que le navigateur a transmis
-- à sa création : cookies `_fbp` / `_fbc`, adresse IP, navigateur, page.
--
-- Renseigné seulement avec le consentement « marketing » du visiteur, et
-- effacé dès que l'événement est parti (voir server/utils/feexpay.ts).
-- ---------------------------------------------------------------------------

alter table commandes add column suivi_meta jsonb;

comment on column commandes.suivi_meta is
  'Contexte Meta (fbp, fbc, ip, ua, url) retenu jusqu''à l''envoi de Purchase. Nul sans consentement marketing.';
