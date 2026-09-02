-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — authentification
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 4 sur 7 · source : 20260828130000_authentification.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Authentification réelle
--
-- Remplace la connexion de démonstration, qui ne vérifiait que l'adresse
-- e-mail. Reprend les règles de la planche C, écran « Connexion sécurisée » :
-- mot de passe, journalisation (IP, appareil, horodatage), verrouillage
-- 30 minutes après 5 échecs et alerte à l'administrateur principal.
--
-- Le hachage est fait côté Node (scrypt, `server/utils/motDePasse.ts`) : la
-- base ne stocke que l'empreinte, jamais le mot de passe.
--
-- La double vérification par code (e-mail + WhatsApp) prévue par la maquette
-- attend un fournisseur d'envoi : la table `codes_verification` est en place,
-- l'étape n'est pas encore activée.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Droits fins des comptes d'administration
--
-- Écran « Créer un compte administrateur » : aucune section n'est cochée par
-- défaut, et le compte ne voit que les sections autorisées — les autres sont
-- masquées, pas seulement désactivées.
-- ---------------------------------------------------------------------------

create type section_admin as enum (
  'administration-acces',
  'cms-site-vitrine',
  'fiches-commerciales',
  'modules-chapitres',
  'offres-commerciales',
  'formateurs',
  'calendrier-sessions',
  'coaching-prive',
  'candidatures-formateurs',
  'ressources-scripts',
  'blog',
  -- Title, meta description, partage, images et textes alternatifs.
  'referencement-contenu',
  -- Slugs publiés, indexation, canonicals — administrateurs supérieurs.
  'referencement-avance',
  'historique-versions',
  'statistiques-performance',
  -- CA agrégé : droit distinct de « Transactions ».
  'performances-marketing',
  -- Décoché par défaut, validation explicite d'un administrateur supérieur.
  'transactions-paiements'
);

alter table utilisateurs
  -- Nul tant qu'aucun mot de passe n'a été défini : le compte ne peut alors
  -- pas se connecter, seulement passer par la réinitialisation.
  add column mot_de_passe_hache text,
  add column sections_autorisees section_admin[] not null default '{}',
  add column verrouille_jusqu_a timestamptz,
  add column derniere_connexion_le timestamptz;

comment on column utilisateurs.sections_autorisees is
  'Sections du back-office visibles par ce compte. Ignoré hors rôles d''administration : un administrateur supérieur voit tout.';

-- ---------------------------------------------------------------------------
-- Journal des connexions
--
-- Conserve les tentatives infructueuses : c'est la source du verrouillage, et
-- la trace demandée par la maquette (IP, appareil, horodatage).
-- ---------------------------------------------------------------------------

create table connexions (
  id             uuid primary key default gen_random_uuid(),
  -- Nul quand l'adresse saisie ne correspond à aucun compte : on garde quand
  -- même la trace de la tentative.
  utilisateur_id text references utilisateurs (id) on delete set null on update cascade,
  email          text not null,
  ip             text,
  appareil       text,
  reussie        boolean not null,
  cree_le        timestamptz not null default now()
);

create index connexions_email_idx on connexions (lower(email), cree_le desc);
create index connexions_date_idx on connexions (cree_le desc);

-- ---------------------------------------------------------------------------
-- Réinitialisation du mot de passe
--
-- Spec §8 : lien valable 30 minutes. Seule l'empreinte du jeton est stockée —
-- une fuite de la table ne permettrait pas de forger un lien valide.
-- ---------------------------------------------------------------------------

create table reinitialisations_mot_de_passe (
  jeton_hache    text primary key,
  utilisateur_id text not null references utilisateurs (id) on delete cascade on update cascade,
  expire_le      timestamptz not null,
  utilise_le     timestamptz,
  cree_le        timestamptz not null default now()
);

create index reinitialisations_utilisateur_idx on reinitialisations_mot_de_passe (utilisateur_id);

-- ---------------------------------------------------------------------------
-- Double vérification à la connexion (préparée, pas encore activée)
--
-- Écran « Code de vérification » : code à six chiffres envoyé par e-mail et
-- WhatsApp, valable 10 minutes. L'envoi attend un fournisseur ; la table est
-- posée pour que le branchement ne demande pas de nouvelle migration.
-- ---------------------------------------------------------------------------

create table codes_verification (
  id             uuid primary key default gen_random_uuid(),
  utilisateur_id text not null references utilisateurs (id) on delete cascade on update cascade,
  code_hache     text not null,
  expire_le      timestamptz not null,
  utilise_le     timestamptz,
  tentatives     integer not null default 0 check (tentatives >= 0),
  cree_le        timestamptz not null default now()
);

create index codes_verification_utilisateur_idx on codes_verification (utilisateur_id, cree_le desc);

-- ---------------------------------------------------------------------------
-- Enregistrement d'une tentative et verrouillage
--
-- Cinq échecs dans la fenêtre glissante verrouillent le compte trente minutes
-- et alertent l'administrateur principal, via le journal d'administration.
-- Le comptage et le verrouillage sont faits d'un bloc : deux tentatives
-- simultanées ne peuvent pas passer entre les mailles.
-- ---------------------------------------------------------------------------

create or replace function enregistrer_tentative_connexion(
  p_email    text,
  p_ip       text,
  p_appareil text,
  p_reussie  boolean
)
returns timestamptz
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_utilisateur utilisateurs%rowtype;
  v_echecs      integer;
  v_verrou      timestamptz;
begin
  select * into v_utilisateur
    from utilisateurs
   where lower(email) = lower(btrim(p_email));

  insert into connexions (utilisateur_id, email, ip, appareil, reussie)
  values (v_utilisateur.id, btrim(p_email), p_ip, p_appareil, p_reussie);

  if v_utilisateur.id is null then
    return null;
  end if;

  if p_reussie then
    update utilisateurs
       set derniere_connexion_le = now(),
           verrouille_jusqu_a = null
     where id = v_utilisateur.id;
    return null;
  end if;

  select count(*) into v_echecs
    from connexions
   where lower(email) = lower(btrim(p_email))
     and not reussie
     and cree_le > now() - interval '30 minutes';

  if v_echecs >= 5 then
    v_verrou := now() + interval '30 minutes';
    update utilisateurs set verrouille_jusqu_a = v_verrou where id = v_utilisateur.id;

    insert into journal (auteur, action, cible)
    values (
      'Système',
      'a verrouillé un compte après 5 échecs de connexion',
      format('%s — déverrouillage automatique à %s',
             v_utilisateur.email, to_char(v_verrou, 'HH24:MI'))
    );

    return v_verrou;
  end if;

  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Sécurité : mêmes règles que les autres tables (accès serveur uniquement).
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'connexions', 'reinitialisations_mot_de_passe', 'codes_verification'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end;
$$;

revoke execute on function
  public.enregistrer_tentative_connexion(text, text, text, boolean)
  from anon, authenticated, public;

grant execute on function
  public.enregistrer_tentative_connexion(text, text, text, boolean)
  to service_role;
