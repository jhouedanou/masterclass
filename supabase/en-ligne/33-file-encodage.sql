-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — file encodage
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 33 sur 33 · source : 20261005120000_file_encodage.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- File d'encodage vidéo
--
-- Le dépôt depuis l'administration produit un MP4 unique. Le multi-débit, lui,
-- demande ffmpeg : rien dans un Worker Cloudflare ne transcode — c'est un
-- isolat V8, sans binaire natif, sans processus fils, avec une mémoire et un
-- budget CPU sans rapport avec un encodage. Le travail revient donc à un
-- exécutant dédié, et cette table est ce qui les relie.
--
-- Deux principes la gouvernent.
--
-- Le dépôt n'attend pas l'encodage. Le MP4 arrive, le chapitre est
-- immédiatement lisible en `fichier`, et le flux le remplace quand il est prêt.
-- Un encodage qui échoue laisse un chapitre lisible, pas un chapitre mort.
--
-- Un travail se prend, il ne se distribue pas. Plusieurs exécutants peuvent
-- tirer sur la même file : c'est `for update skip locked` qui garantit qu'ils
-- n'empoignent pas le même fichier, et non la bonne volonté de l'appelant.
-- ---------------------------------------------------------------------------

create table travaux_video (
  id             uuid primary key default gen_random_uuid(),
  -- L'objet à encoder, pas le chapitre : depuis la médiathèque, une même vidéo
  -- sert plusieurs chapitres et ne doit être transcodée qu'une fois.
  video_id       uuid not null references videos (id) on delete cascade,
  -- Copiée à la mise en file : elle permet de lire le travail sans jointure, et
  -- elle survit à l'effacement de l'entrée pour le journal.
  cle            text not null,
  statut         text not null default 'en-file'
                 check (statut in ('en-file', 'encodage', 'termine', 'echec')),
  -- Incrémentée à chaque prise. Au-delà du plafond, le travail est déclaré en
  -- échec : sans ce compte, un fichier inencodable reprendrait indéfiniment sa
  -- place dans la file, qui ne se viderait jamais.
  tentatives     integer not null default 0 check (tentatives >= 0),
  -- Renseignés au succès, d'après l'`info.json` que le transcodeur écrit.
  paliers        text[],
  duree_secondes integer check (duree_secondes > 0),
  octets         bigint  check (octets > 0),
  erreur         text,
  -- Horodate la prise. Un exécutant peut mourir en cours de route — machine
  -- éteinte, conteneur recyclé — et son travail resterait « en encodage » pour
  -- toujours. C'est cette date qui permet de le rendre à la file.
  pris_le        timestamptz,
  cree_le        timestamptz not null default now(),
  maj_le         timestamptz not null default now()
);

create trigger travaux_video_maj_le before update on travaux_video
  for each row execute function touch_maj_le();

-- Un seul travail vivant par vidéo. Deux dépôts successifs sur le même
-- chapitre, ou un remplacement pendant qu'un encodage court, produiraient deux
-- exécutants écrivant dans le même dossier.
create unique index travaux_video_vivant_idx on travaux_video (video_id)
  where statut in ('en-file', 'encodage');

-- La file se lit par ancienneté : l'index sert la prise, appelée en boucle.
create index travaux_video_file_idx on travaux_video (statut, cree_le)
  where statut in ('en-file', 'encodage');

comment on table travaux_video is
  'File d''encodage : un MP4 déposé attend d''être transcodé en flux à plusieurs débits par un exécutant externe. Le chapitre reste lisible pendant ce temps.';

alter table travaux_video enable row level security;
revoke all on travaux_video from anon, authenticated;

-- ---------------------------------------------------------------------------
-- prendre_travail_video — la seule opération qui ne peut pas être faite en SQL
-- ordinaire depuis l'application
--
-- Elle fait deux choses d'affilée, et l'ordre compte : rendre à la file les
-- travaux qu'un exécutant disparu a laissés en plan, puis en saisir un.
-- ---------------------------------------------------------------------------

create or replace function prendre_travail_video(
  p_minutes_abandon integer default 60,
  p_tentatives_max  integer default 3
) returns table (
  id             uuid,
  video_id       uuid,
  cle            text,
  tentatives     integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Un travail pris il y a trop longtemps a perdu son exécutant. Il retourne
  -- à la file, sauf s'il a déjà épuisé ses tentatives — auquel cas s'acharner
  -- ne ferait que bloquer les suivants derrière lui.
  update travaux_video t
     set statut  = case when t.tentatives >= p_tentatives_max then 'echec' else 'en-file' end,
         erreur  = case
                     when t.tentatives >= p_tentatives_max
                       then 'Abandonné : ' || t.tentatives || ' tentatives sans réponse de l''exécutant.'
                     else t.erreur
                   end,
         pris_le = null
   where t.statut = 'encodage'
     and t.pris_le < now() - make_interval(mins => p_minutes_abandon);

  -- `skip locked` est le cœur du mécanisme : deux exécutants qui appellent en
  -- même temps repartent avec deux travaux distincts, au lieu d'attendre l'un
  -- l'autre ou de saisir le même.
  return query
  with saisi as (
    select t.id
      from travaux_video t
     where t.statut = 'en-file'
       and t.tentatives < p_tentatives_max
     order by t.cree_le
     limit 1
     for update skip locked
  )
  update travaux_video t
     set statut     = 'encodage',
         pris_le    = now(),
         tentatives = t.tentatives + 1
    from saisi
   where t.id = saisi.id
  returning t.id, t.video_id, t.cle, t.tentatives;
end;
$$;

comment on function prendre_travail_video is
  'Saisit un travail d''encodage pour l''exécutant appelant, après avoir rendu à la file ceux qu''un exécutant disparu a laissés en plan. Ne rend aucune ligne quand la file est vide.';

-- `security definer` : comme les autres fonctions métier, elle ne doit jamais
-- être appelable avec la clé publiable. PostgreSQL accorde `execute` à `public`
-- par défaut — c'est l'oubli qui avait laissé `enregistrer_visionnage` ouverte.
revoke execute on function
  public.prendre_travail_video(integer, integer)
  from anon, authenticated, public;

grant execute on function
  public.prendre_travail_video(integer, integer)
  to service_role;
