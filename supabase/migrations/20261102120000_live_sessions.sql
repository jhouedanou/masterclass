-- ---------------------------------------------------------------------------
-- Live Sessions (brief du 02/11, nouvelle maquette)
--
-- Une Live Session est une séance en direct ouverte au public : elle a sa
-- fiche (prérequis, ce que l'on apprend, formateur, date, prix), son entrée
-- dans le menu et sa place sur l'accueil. Elle ne dépend d'aucun module, à la
-- différence du coaching collectif (`sessions_coaching`), réservé aux
-- acheteurs d'un module de la thématique.
--
-- Parcours : inscription → lien Zoom (écran et e-mail) → connexion par la
-- salle de la plateforme. L'inscription en ligne n'est ouverte qu'aux séances
-- gratuites : le paiement d'une Live Session payante attend l'arbitrage de
-- Big Five, et la fiche l'annonce sans encaisser.
-- ---------------------------------------------------------------------------

create sequence seq_live_session;

create table live_sessions (
  id            text primary key default 'live-' || lpad(nextval('seq_live_session')::text, 3, '0'),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titre         text not null check (btrim(titre) <> ''),
  -- Accroche de la carte et de la fiche.
  resume        text not null default '',
  description   text not null default '',
  prerequis     text[] not null default '{}',
  objectifs     text[] not null default '{}',
  formateur_id  text not null references formateurs (id) on update cascade,
  date_seance   date not null,
  heure         time not null,
  duree_minutes integer not null default 90 check (duree_minutes > 0),
  prix_fcfa     integer not null default 0 check (prix_fcfa >= 0),
  places        integer not null default 100 check (places > 0),
  inscrits      integer not null default 0 check (inscrits >= 0),
  statut        text not null default 'brouillon'
                check (statut in ('brouillon', 'publiee', 'annulee', 'terminee')),
  image         text,
  zoom_reunion_id         text,
  zoom_mot_de_passe       text,
  zoom_lien_participation text,
  zoom_lien_hote          text,
  cree_le       timestamptz not null default now(),
  maj_le        timestamptz not null default now(),
  constraint live_places_disponibles check (inscrits <= places)
);

create index live_sessions_date_idx on live_sessions (date_seance);
create index live_sessions_formateur_idx on live_sessions (formateur_id);

comment on table live_sessions is
  'Séances en direct ouvertes au public, avec fiche et prix. Distinctes du coaching collectif.';

create trigger live_sessions_maj_le before update on live_sessions
  for each row execute function touch_maj_le();

create table inscriptions_live (
  live_session_id text not null references live_sessions (id) on delete cascade on update cascade,
  utilisateur_id  text not null references utilisateurs (id) on delete cascade on update cascade,
  inscrit_le      timestamptz not null default now(),
  primary key (live_session_id, utilisateur_id)
);

create index inscriptions_live_utilisateur_idx on inscriptions_live (utilisateur_id);

alter table live_sessions enable row level security;
alter table inscriptions_live enable row level security;
revoke all on live_sessions, inscriptions_live from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Inscription : verrou de ligne, comme `reserver_place_session`, pour que deux
-- inscriptions simultanées ne prennent pas la dernière place toutes les deux.
-- ---------------------------------------------------------------------------

create or replace function inscrire_live_session(
  p_live_session_id text,
  p_utilisateur_id  text
)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_session live_sessions%rowtype;
begin
  select * into v_session
    from live_sessions
   where id = p_live_session_id
     for update;

  if not found or v_session.statut <> 'publiee' then
    raise exception 'Live Session introuvable ou annulée' using errcode = 'EM404';
  end if;

  if (v_session.date_seance + v_session.heure) + make_interval(mins => v_session.duree_minutes)
     < (now() at time zone 'Africa/Abidjan') then
    raise exception 'Cette Live Session est terminée' using errcode = 'EM409';
  end if;

  if v_session.prix_fcfa > 0 then
    raise exception 'L''inscription en ligne à une Live Session payante n''est pas encore ouverte'
      using errcode = 'EM409';
  end if;

  if exists (
    select 1 from inscriptions_live
     where live_session_id = p_live_session_id and utilisateur_id = p_utilisateur_id
  ) then
    raise exception 'Vous êtes déjà inscrit à cette Live Session' using errcode = 'EM409';
  end if;

  if v_session.inscrits >= v_session.places then
    raise exception 'Live Session complète' using errcode = 'EM409';
  end if;

  insert into inscriptions_live (live_session_id, utilisateur_id)
  values (p_live_session_id, p_utilisateur_id);

  update live_sessions set inscrits = inscrits + 1 where id = p_live_session_id;

  return v_session.inscrits + 1;
end;
$$;

revoke execute on function public.inscrire_live_session(text, text) from anon, authenticated, public;
grant execute on function public.inscrire_live_session(text, text) to service_role;
