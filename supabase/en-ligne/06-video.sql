-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — video
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 6 sur 7 · source : 20260902120000_video.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Vidéo : rattachement des flux HLS et relevé du temps réellement visionné
--
-- La vidéo elle-même ne vit pas en base : elle est transcodée une fois puis
-- déposée sur un stockage d'objets. La base ne garde que la clé du dossier,
-- qui sert de segment d'URL, et la durée réelle mesurée au transcodage.
--
-- Le relevé de visionnage répond à une exigence de la maquette : l'avance
-- rapide ne doit pas valider un chapitre. On enregistre donc le temps vu, pas
-- la position du curseur, et la progression du module s'en déduit.
-- ---------------------------------------------------------------------------

alter table chapitres
  add column video_cle             text,
  add column video_duree_secondes  integer check (video_duree_secondes > 0);

-- La clé devient un segment d'URL et un nom de dossier : la contraindre ici
-- évite d'avoir à s'en défier partout ailleurs.
alter table chapitres
  add constraint chapitres_video_cle_format
    check (video_cle is null or video_cle ~ '^[a-z0-9][a-z0-9-]{2,80}$');

alter table chapitres
  add constraint chapitres_video_cle_unique unique (video_cle);

comment on column chapitres.video_cle is
  'Dossier du flux HLS sur le CDN. NULL tant que la vidéo n''est pas montée : le lecteur affiche alors l''écran d''attente.';
comment on column chapitres.video_duree_secondes is
  'Durée mesurée au transcodage. Fait autorité sur duree_minutes, qui reste une estimation éditoriale.';

-- ---------------------------------------------------------------------------
-- Temps réellement visionné, chapitre par chapitre
-- ---------------------------------------------------------------------------

create table visionnages (
  utilisateur_id text    not null references utilisateurs (id) on delete cascade on update cascade,
  chapitre_id    uuid    not null references chapitres (id) on delete cascade,
  -- Cumul du temps effectivement écoulé sous lecture, jamais la position
  -- atteinte : c'est toute la différence avec une barre de progression.
  secondes_vues  integer not null default 0 check (secondes_vues >= 0),
  maj_le         timestamptz not null default now(),
  primary key (utilisateur_id, chapitre_id)
);

create index visionnages_utilisateur_idx on visionnages (utilisateur_id);

comment on table visionnages is
  'Temps de lecture cumulé. Alimente la progression du module ; l''avance rapide ne l''augmente pas.';

create trigger visionnages_maj_le before update on visionnages
  for each row execute function touch_maj_le();

-- ---------------------------------------------------------------------------
-- enregistrer_visionnage — appelé toutes les dix secondes par le lecteur
--
-- Le cumul ne peut que croître : un rechargement de page, une reprise ou une
-- seconde lecture ne font jamais reculer un apprenant.
-- ---------------------------------------------------------------------------

create or replace function enregistrer_visionnage(
  p_utilisateur_id text,
  p_chapitre_id    uuid,
  p_secondes_vues  integer
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_module_id    text;
  v_progression  integer;
begin
  if p_secondes_vues is null or p_secondes_vues < 0 then
    raise exception 'Temps de visionnage invalide' using errcode = 'EM422';
  end if;

  select module_id into v_module_id from chapitres where id = p_chapitre_id;
  if v_module_id is null then
    raise exception 'Chapitre introuvable' using errcode = 'EM404';
  end if;

  -- Le contrôle d'accès est porté par la base : un appel direct à la fonction
  -- ne peut pas contourner ce que l'API vérifie déjà.
  if not exists (
    select 1 from acces
     where utilisateur_id = p_utilisateur_id and module_id = v_module_id
  ) then
    raise exception 'Ce module ne fait pas partie de vos accès' using errcode = 'EM403';
  end if;

  insert into visionnages (utilisateur_id, chapitre_id, secondes_vues)
  values (p_utilisateur_id, p_chapitre_id, p_secondes_vues)
  on conflict (utilisateur_id, chapitre_id) do update
    set secondes_vues = greatest(visionnages.secondes_vues, excluded.secondes_vues);

  -- Progression du module : part du temps vu sur le temps total, chaque
  -- chapitre étant plafonné à sa propre durée. Les chapitres sans vidéo sont
  -- ignorés, faute de quoi un module en cours de montage plafonnerait bas.
  select coalesce(
           round(
             100.0 * sum(least(coalesce(v.secondes_vues, 0), c.video_duree_secondes))
                   / nullif(sum(c.video_duree_secondes), 0)
           ),
           0
         )::integer
    into v_progression
    from chapitres c
    left join visionnages v
      on v.chapitre_id = c.id and v.utilisateur_id = p_utilisateur_id
   where c.module_id = v_module_id
     and c.video_duree_secondes is not null;

  update acces
     set progression = greatest(progression, v_progression),
         termine_le  = case
                         when v_progression >= 100 and termine_le is null then current_date
                         else termine_le
                       end
   where utilisateur_id = p_utilisateur_id and module_id = v_module_id;

  return v_progression;
end;
$$;

comment on function enregistrer_visionnage is
  'Cumule le temps vu d''un chapitre et en déduit la progression du module. Monotone : ne fait jamais reculer.';

alter table visionnages enable row level security;
