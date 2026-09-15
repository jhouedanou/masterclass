-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — vitrine
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 10 sur 18 · source : 20260916120000_vitrine.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Planche A — site vitrine
--
-- Les six cas d'échec du tunnel de paiement tels que la maquette 04c les
-- nomme (deux manquaient : « Interruption réseau » et « Double paiement
-- détecté »), le lien LinkedIn distinct du portfolio dans une candidature
-- (06), et le verrouillage de connexion à quinze minutes comme l'annonce
-- l'écran 04b (« Il vous reste 3 tentatives avant verrouillage temporaire du
-- compte (15 min) »).
-- ---------------------------------------------------------------------------

alter type code_echec_paiement add value if not exists 'interruption-reseau';
alter type code_echec_paiement add value if not exists 'doublon';

alter table candidatures_formateurs
  add column linkedin text;

comment on column candidatures_formateurs.lien is 'Portfolio ou site du candidat (obligatoire depuis la planche A, 06).';
comment on column candidatures_formateurs.linkedin is 'Profil LinkedIn du candidat (obligatoire depuis la planche A, 06).';

-- Verrouillage à 15 minutes : la fenêtre de comptage et la durée du verrou
-- suivent le libellé de l'écran de connexion.
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
     and cree_le > now() - interval '15 minutes';

  if v_echecs >= 5 then
    v_verrou := now() + interval '15 minutes';
    update utilisateurs set verrouille_jusqu_a = v_verrou where id = v_utilisateur.id;

    insert into journal (auteur, action, cible, type, objet)
    values (
      'Système',
      'a verrouillé un compte après 5 échecs de connexion',
      format('%s — déverrouillage automatique à %s',
             v_utilisateur.email, to_char(v_verrou, 'HH24:MI')),
      'securite',
      'compte'
    );

    return v_verrou;
  end if;

  return null;
end;
$$;

-- Nombre d'échecs récents d'une adresse, pour afficher « Il vous reste N tentatives ».
create or replace function compter_echecs_connexion(p_email text)
returns integer
language sql
security invoker
set search_path = public, pg_temp
stable
as $$
  select count(*)::integer
    from connexions
   where lower(email) = lower(btrim(p_email))
     and not reussie
     and cree_le > now() - interval '15 minutes';
$$;

revoke execute on function public.compter_echecs_connexion(text) from anon, authenticated, public;
grant execute on function public.compter_echecs_connexion(text) to service_role;
