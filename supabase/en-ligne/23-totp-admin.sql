-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — totp admin
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 23 sur 31 · source : 20260925120000_totp_admin.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Double authentification admin par application (TOTP)
--
-- La double vérification reposait sur un code à six chiffres censé partir par
-- e-mail. Il n'est jamais parti : le seul pilote de notification écrit dans la
-- sortie du serveur (`NOTIFICATIONS_DRIVER=console`), et la voie Supabase Auth
-- est fermée par l'offre gratuite du projet. Se connecter à l'administration
-- demandait donc de lire les logs. La migration `…_comptes_admin.sql` avait
-- déjà dû déplacer un compte vers une vraie boîte aux lettres pour cette raison.
--
-- Un TOTP (RFC 6238) supprime le transport : l'application d'authentification
-- et le serveur dérivent le même code d'un secret partagé une seule fois et de
-- l'heure courante. Rien à envoyer, rien à attendre, rien à intercepter.
--
-- Trois colonnes suffisent sur `utilisateurs`, plus une table pour les codes de
-- secours. Les apprenants et les formateurs ne sont pas concernés : seuls les
-- rôles `admin-contenu` et `admin-superieur` passent par la double
-- authentification (voir `server/api/auth/admin/connexion.post.ts`).
-- ---------------------------------------------------------------------------

alter table utilisateurs
  -- Secret partagé, chiffré au repos (AES-256-GCM, clé `TOTP_CLE`). Il doit
  -- être relu à chaque vérification, donc il ne peut pas être haché comme un
  -- mot de passe : le chiffrement évite qu'une fuite de la base laisse
  -- fabriquer des codes valides. Jamais exposé au client — `versUtilisateur`
  -- ne le mappe pas, comme il ne mappe pas `mot_de_passe_hache`.
  add column totp_secret      text,
  -- Nul tant que l'enrôlement n'est pas confirmé par un premier code correct :
  -- un secret déposé mais mal scanné condamnerait le compte.
  add column totp_active_le   timestamptz,
  -- Dernier pas de temps consommé. Un code vaut trente secondes ; sans cette
  -- borne, un code lu par-dessus l'épaule se rejoue jusqu'à expiration, et la
  -- tolérance d'horloge allonge encore la fenêtre.
  add column totp_dernier_pas bigint;

comment on column utilisateurs.totp_secret is
  'Secret TOTP chiffré (AES-256-GCM). Ne jamais renvoyer au client.';

-- ---------------------------------------------------------------------------
-- Codes de secours
--
-- Le secret vit dans l'application : téléphone perdu, compte inaccessible. Huit
-- codes sont remis à l'enrôlement, affichés une seule fois, et consommables une
-- fois chacun.
--
-- Seule l'empreinte est conservée, comme pour les jetons de réinitialisation :
-- un vol de la table ne permet pas de s'en servir. SHA-256 sans sel convient
-- ici — contrairement à un mot de passe choisi par un humain, ces codes sont
-- tirés au sort sur assez de bits pour qu'aucune table précalculée ne tienne.
-- ---------------------------------------------------------------------------

create table codes_secours (
  id             uuid primary key default gen_random_uuid(),
  utilisateur_id text not null references utilisateurs (id) on delete cascade on update cascade,
  empreinte      text not null,
  cree_le        timestamptz not null default now(),
  utilise_le     timestamptz
);

comment on table codes_secours is
  'Codes de secours à usage unique de la double authentification admin.';

-- Les codes encore valables d'un compte, dans l'ordre de leur création.
create index codes_secours_utilisateur_idx
  on codes_secours (utilisateur_id, cree_le)
  where utilise_le is null;

-- ---------------------------------------------------------------------------
-- Sécurité : mêmes règles que les autres tables (accès serveur uniquement).
-- ---------------------------------------------------------------------------

alter table codes_secours enable row level security;
revoke all on codes_secours from anon, authenticated;
