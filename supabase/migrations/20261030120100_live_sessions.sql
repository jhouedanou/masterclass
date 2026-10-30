-- ---------------------------------------------------------------------------
-- Live Session (CDC v1.3) : sessions, inscriptions, réglage de visibilité
--
-- Une Live Session vend au prix du module (RM1) une formation donnée en
-- direct sur Zoom, à la place d'un module vidéo pas encore monté. Une
-- inscription confirmée vaut achat du module (§3.4) : elle crée la ligne
-- `acces`, qui ouvre le quiz après la session, le coaching collectif (RM7) et
-- la vidéo une fois publiée (RM6).
--
-- Les champs Zoom ne sortent jamais par une route publique (RM4) : comme
-- toutes les tables, celles-ci ne sont lues que par le serveur applicatif.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Sessions
-- ---------------------------------------------------------------------------

create table sessions_live (
  id                            uuid primary key default gen_random_uuid(),
  module_id                     text not null references modules (id) on update cascade,
  -- URL publique /live-sessions/[slug].
  slug                          text not null unique,
  -- Instant de début, en UTC (RM9 : saisi et affiché en GMT, identique).
  debut                         timestamptz not null,
  -- Durée prévue, questions-réponses comprises.
  duree_minutes                 integer not null default 90 check (duree_minutes between 15 and 600),
  -- Limite de participants de la licence Zoom utilisée (RM3, §9).
  capacite                      integer not null check (capacite > 0),
  formateur_id                  text not null references formateurs (id) on update cascade,
  -- Admin qui modère la session (10.F) : obligatoire pour publier.
  moderateur_id                 text references utilisateurs (id) on update cascade on delete set null,
  -- Réunion Zoom : confidentielle (RM4). Rejointe depuis la plateforme par le
  -- Meeting SDK (option B, 10.G) ; les liens ne servent qu'en secours.
  zoom_reunion_id               text,
  zoom_mot_de_passe             text,
  zoom_lien_participation       text,
  zoom_lien_hote                text,
  -- Support de cours facultatif (RM5) : chemin dans le seau privé
  -- `supports-live`, lu par URL signée.
  support_chemin                text,
  support_nom                   text,
  -- Fiche publique.
  prerequis                     jsonb not null default '[]'::jsonb,
  gains                         jsonb not null default '[]'::jsonb,
  -- Déroulé : [{ decalageMinutes, libelle, questionsReponses }].
  deroule                       jsonb not null default '[]'::jsonb,
  -- Préparation du formateur (planche 08).
  deroule_valide_le             timestamptz,
  test_technique_le             timestamptz,
  statut                        statut_session_live not null default 'brouillon',
  publiee_le                    timestamptz,
  termine_le                    timestamptz,
  annule_le                     timestamptz,
  video_publiee_le              timestamptz,
  -- Idempotence des envois au formateur (§7).
  envoye_formateur_planifiee_le timestamptz,
  envoye_formateur_j1_le        timestamptz,
  cree_le                       timestamptz not null default now(),
  maj_le                        timestamptz not null default now(),
  constraint session_live_publiee_complete check (
    statut in ('brouillon', 'annulee')
    or (moderateur_id is not null and zoom_reunion_id is not null)
  )
);

-- Une seule session active (brouillon, publiée, en cours) par module (§3.2).
create unique index sessions_live_module_active_idx
  on sessions_live (module_id)
  where statut in ('brouillon', 'publiee', 'en-cours');

create index sessions_live_statut_debut_idx on sessions_live (statut, debut);
create index sessions_live_formateur_idx on sessions_live (formateur_id);

create trigger sessions_live_maj_le
  before update on sessions_live
  for each row execute function touch_maj_le();

comment on table sessions_live is
  'Live Sessions : formation en direct sur Zoom rattachée à un module (CDC v1.3).';
comment on column sessions_live.zoom_lien_hote is
  'Lien hôte : visible du formateur (à partir de H-30) et des admins seulement.';

-- ---------------------------------------------------------------------------
-- 2. Inscriptions
-- ---------------------------------------------------------------------------

create table inscriptions_live (
  id                    uuid primary key default gen_random_uuid(),
  session_live_id       uuid not null references sessions_live (id) on delete cascade,
  utilisateur_id        text not null references utilisateurs (id) on update cascade on delete cascade,
  -- Commande FeexPay en cours ou payée : la transaction se retrouve par elle.
  commande_reference    text references commandes (reference) on update cascade on delete set null,
  statut                statut_inscription_live not null default 'attente',
  -- Place réservée 15 minutes pendant le paiement (§6).
  reservation_expire_le timestamptz,
  confirme_le           timestamptz,
  -- Idempotence des envois (§7) : posés dans la même requête que l'envoi.
  envoye_j1_le          timestamptz,
  envoye_m10_le         timestamptz,
  envoye_h0_le          timestamptz,
  envoye_fin_le         timestamptz,
  envoye_video_le       timestamptz,
  -- Provenance publicitaire (10.B), recopiée du cookie à l'inscription.
  utm_source            text,
  utm_medium            text,
  utm_campaign          text,
  fbclid                text,
  ttclid                text,
  li_fat_id             text,
  cree_le               timestamptz not null default now(),
  maj_le                timestamptz not null default now(),
  -- Double clic, deux onglets : une seule inscription par session (§11).
  unique (session_live_id, utilisateur_id)
);

create index inscriptions_live_commande_idx on inscriptions_live (commande_reference);
create index inscriptions_live_utilisateur_idx on inscriptions_live (utilisateur_id);

create trigger inscriptions_live_maj_le
  before update on inscriptions_live
  for each row execute function touch_maj_le();

-- ---------------------------------------------------------------------------
-- 3. Commande et accès
-- ---------------------------------------------------------------------------

alter table commandes
  add column session_live_id uuid references sessions_live (id) on delete set null;

create index commandes_session_live_idx on commandes (session_live_id) where session_live_id is not null;

comment on column commandes.session_live_id is
  'Live Session réglée par la commande : aucune ligne module, la transaction porte le module.';

alter table acces drop constraint if exists acces_origine_check;
alter table acces
  add constraint acces_origine_check check (origine in ('achat', 'attribution', 'live-session')),
  add column inscription_live_id uuid references inscriptions_live (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 4. Réglage de visibilité (10.G)
-- ---------------------------------------------------------------------------

create table reglages_live (
  id         boolean primary key default true check (id),
  -- `personne` : tout est masqué ; `admins` : test en production ; `tous` :
  -- ouvert aux apprenants et aux formateurs.
  visibilite visibilite_live not null default 'personne',
  maj_le     timestamptz not null default now(),
  maj_par    text
);

create trigger reglages_live_maj_le
  before update on reglages_live
  for each row execute function touch_maj_le();

insert into reglages_live (id) values (true);

-- ---------------------------------------------------------------------------
-- 5. Réservation d'une place (§6, étape 1)
--
-- Le verrou sur la ligne de session sérialise les réservations concurrentes :
-- deux apprenants ne peuvent pas prendre la dernière place en même temps.
-- La place reste à celui qui paie pendant 15 minutes (§11).
-- ---------------------------------------------------------------------------

create or replace function reserver_place_live(
  p_session_id         uuid,
  p_utilisateur_id     text,
  p_commande_reference text,
  p_attribution        jsonb default '{}'::jsonb
)
returns inscriptions_live
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_session     sessions_live%rowtype;
  v_inscription inscriptions_live%rowtype;
  v_occupees    integer;
begin
  select * into v_session from sessions_live where id = p_session_id for update;

  if not found or v_session.statut <> 'publiee' then
    raise exception 'Cette Live Session n''est pas ouverte aux inscriptions' using errcode = 'EM404';
  end if;

  if now() >= v_session.debut then
    raise exception 'Les inscriptions sont closes : la session a commencé' using errcode = 'EM409';
  end if;

  if exists (
    select 1 from acces
     where utilisateur_id = p_utilisateur_id
       and module_id = v_session.module_id
       and revoque_le is null
  ) then
    raise exception 'Ce module fait déjà partie de vos accès' using errcode = 'EM409';
  end if;

  select * into v_inscription
    from inscriptions_live
   where session_live_id = p_session_id
     and utilisateur_id = p_utilisateur_id
     for update;

  if found and v_inscription.statut = 'confirmee' then
    raise exception 'Vous êtes déjà inscrit(e) à cette Live Session' using errcode = 'EM409';
  end if;

  if found and v_inscription.statut = 'a-rembourser' then
    raise exception 'Votre paiement est en cours de traitement par l''équipe' using errcode = 'EM409';
  end if;

  -- Places prises par les autres : confirmées, et réservations encore valables.
  select count(*) into v_occupees
    from inscriptions_live
   where session_live_id = p_session_id
     and utilisateur_id <> p_utilisateur_id
     and (statut = 'confirmee' or (statut = 'attente' and reservation_expire_le > now()));

  if v_occupees >= v_session.capacite then
    raise exception 'Cette Live Session est complète' using errcode = 'EM410';
  end if;

  if v_inscription.id is not null then
    update inscriptions_live
       set statut = 'attente',
           commande_reference = p_commande_reference,
           reservation_expire_le = now() + interval '15 minutes',
           utm_source   = coalesce(p_attribution ->> 'utm_source', utm_source),
           utm_medium   = coalesce(p_attribution ->> 'utm_medium', utm_medium),
           utm_campaign = coalesce(p_attribution ->> 'utm_campaign', utm_campaign),
           fbclid       = coalesce(p_attribution ->> 'fbclid', fbclid),
           ttclid       = coalesce(p_attribution ->> 'ttclid', ttclid),
           li_fat_id    = coalesce(p_attribution ->> 'li_fat_id', li_fat_id)
     where id = v_inscription.id
     returning * into v_inscription;
  else
    insert into inscriptions_live (
      session_live_id, utilisateur_id, commande_reference, statut, reservation_expire_le,
      utm_source, utm_medium, utm_campaign, fbclid, ttclid, li_fat_id
    )
    values (
      p_session_id, p_utilisateur_id, p_commande_reference, 'attente', now() + interval '15 minutes',
      p_attribution ->> 'utm_source', p_attribution ->> 'utm_medium', p_attribution ->> 'utm_campaign',
      p_attribution ->> 'fbclid', p_attribution ->> 'ttclid', p_attribution ->> 'li_fat_id'
    )
    returning * into v_inscription;
  end if;

  return v_inscription;
end;
$$;

comment on function reserver_place_live is
  'Réserve une place 15 min avant paiement (§6) : session publiée, pas commencée, module non acquis, capacité respectée.';

-- ---------------------------------------------------------------------------
-- 6. Confirmation après paiement (§6, étapes 2 et 3)
--
-- Idempotente : un webhook rejoué ne confirme ni n'écrit deux fois (T11).
-- Une réservation encore valable garantit la place. Passé son délai ou
-- après le début, l'inscription est confirmée si la capacité le permet ;
-- sinon elle passe « à rembourser », traité hors plateforme.
-- ---------------------------------------------------------------------------

create or replace function confirmer_inscription_live(p_commande_reference text)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_inscription inscriptions_live%rowtype;
  v_session     sessions_live%rowtype;
  v_garantie    boolean;
  v_occupees    integer;
begin
  select * into v_inscription
    from inscriptions_live
   where commande_reference = p_commande_reference
     for update;

  if not found then
    raise exception 'Aucune inscription ne correspond à cette commande' using errcode = 'EM404';
  end if;

  if v_inscription.statut in ('confirmee', 'a-rembourser') then
    return jsonb_build_object(
      'inscription_id', v_inscription.id,
      'session_id', v_inscription.session_live_id,
      'statut', v_inscription.statut,
      'premiere_confirmation', false
    );
  end if;

  select * into v_session from sessions_live where id = v_inscription.session_live_id for update;

  v_garantie := v_inscription.statut = 'attente'
                and v_inscription.reservation_expire_le > now()
                and v_session.statut in ('publiee', 'en-cours');

  if not v_garantie then
    select count(*) into v_occupees
      from inscriptions_live
     where session_live_id = v_session.id
       and id <> v_inscription.id
       and (statut = 'confirmee' or (statut = 'attente' and reservation_expire_le > now()));

    if v_session.statut not in ('publiee', 'en-cours', 'terminee') or v_occupees >= v_session.capacite then
      update inscriptions_live
         set statut = 'a-rembourser', reservation_expire_le = null
       where id = v_inscription.id;
      return jsonb_build_object(
        'inscription_id', v_inscription.id,
        'session_id', v_session.id,
        'statut', 'a-rembourser',
        'premiere_confirmation', true
      );
    end if;
  end if;

  update inscriptions_live
     set statut = 'confirmee', confirme_le = now(), reservation_expire_le = null
   where id = v_inscription.id;

  -- Une inscription = un achat du module (§3.4).
  insert into acces (utilisateur_id, module_id, origine, inscription_live_id)
  values (v_inscription.utilisateur_id, v_session.module_id, 'live-session', v_inscription.id)
  on conflict (utilisateur_id, module_id) do update
    set revoque_le = null,
        motif_revocation = null,
        inscription_live_id = coalesce(acces.inscription_live_id, excluded.inscription_live_id);

  return jsonb_build_object(
    'inscription_id', v_inscription.id,
    'session_id', v_session.id,
    'statut', 'confirmee',
    'premiere_confirmation', true
  );
end;
$$;

comment on function confirmer_inscription_live is
  'Confirme l''inscription réglée par une commande et ouvre l''accès au module ; idempotente (§6, T11).';

-- ---------------------------------------------------------------------------
-- 7. Le quiz et le certificat après la session (10.D)
--
-- Le quiz d'un module s'ouvre à 100 % de progression vidéo. Pour un inscrit à
-- une Live Session, il s'ouvre dès la fin de la session : il n'y a pas encore
-- de vidéo à regarder. Même mécanique pour le reste (tentatives, seuil).
-- ---------------------------------------------------------------------------

create or replace function live_terminee_pour(p_utilisateur_id text, p_module_id text)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from inscriptions_live i
      join sessions_live s on s.id = i.session_live_id
     where i.utilisateur_id = p_utilisateur_id
       and s.module_id = p_module_id
       and i.statut = 'confirmee'
       and s.statut = 'terminee'
  );
$$;

comment on function live_terminee_pour is
  'Vrai si l''apprenant a suivi (inscription confirmée) une Live Session terminée de ce module.';

-- ---------------------------------------------------------------------------
-- 8. Support de cours : seau privé
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'Schéma storage absent : seau « supports-live » non créé.';
    return;
  end if;

  -- Privé : lu par URL signée, après la session, par les inscrits (RM5).
  -- 50 Mo, PDF et diaporamas.
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('supports-live', 'supports-live', false, 52428800,
          array[
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.ms-powerpoint',
            'application/zip'
          ])
  on conflict (id) do update set
    public             = excluded.public,
    file_size_limit    = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Droits
-- ---------------------------------------------------------------------------

alter table sessions_live enable row level security;
alter table inscriptions_live enable row level security;
alter table reglages_live enable row level security;

revoke all on sessions_live, inscriptions_live, reglages_live from anon, authenticated;

revoke execute on function
  public.reserver_place_live(uuid, text, text, jsonb),
  public.confirmer_inscription_live(text),
  public.live_terminee_pour(text, text)
  from anon, authenticated, public;

grant execute on function
  public.reserver_place_live(uuid, text, text, jsonb),
  public.confirmer_inscription_live(text),
  public.live_terminee_pour(text, text)
  to service_role;
