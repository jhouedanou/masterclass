-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — mediatheque video
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 30 sur 31 · source : 20261002120000_mediatheque_video.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Médiathèque vidéo
--
-- Jusqu'ici une vidéo appartenait à un chapitre et à un seul : le dépôt créait
-- un objet dans le stockage, le chapitre en gardait la clé, et retirer la vidéo
-- effaçait l'objet. Rien ne permettait de revoir ce qui avait été déposé, ni de
-- réutiliser un fichier déjà en ligne — réemployer une introduction sur deux
-- modules imposait de la téléverser deux fois, pour deux copies facturées deux
-- fois dans le stockage.
--
-- Le fichier devient donc une entité à part entière, que les chapitres
-- désignent. Trois conséquences tiennent tout le reste :
--
--   1. Un même fichier peut servir plusieurs chapitres. La clé de stockage ne
--      change pas pour autant : elle porte encore le nom du module où la vidéo
--      a été déposée la première fois, ce qui est un souvenir, pas une
--      appartenance. Renommer un objet dans un stockage d'objets veut dire le
--      recopier entièrement — sept cents mégaoctets pour un libellé.
--
--   2. Retirer une vidéo d'un chapitre ne l'efface plus : elle retourne à la
--      médiathèque. L'effacement devient un geste distinct, et le décompte des
--      chapitres qui s'en servent le refuse tant qu'un seul subsiste.
--
--   3. Les colonnes `video_*` des chapitres restent en place, en copie. Une
--      jointure de plus sur le chemin de lecture d'un apprenant coûterait plus
--      cher que la redondance, et `attacherVideoChapitre` les tient à jour d'un
--      seul geste.
-- ---------------------------------------------------------------------------

create table videos (
  id             uuid primary key default gen_random_uuid(),
  -- Le dossier dans le stockage. Unique : deux entrées désignant le même objet
  -- rendraient l'effacement de l'une destructeur pour l'autre.
  cle            text not null unique,
  -- Le titre que l'équipe lit dans la médiathèque. Au dépôt, c'est le nom du
  -- fichier ; il se renomme ensuite sans que l'objet bouge.
  nom            text not null check (length(btrim(nom)) between 1 and 200),
  -- Le nom d'origine, gardé tel quel : c'est lui qui permet de reconnaître un
  -- fichier sur le poste de montage six mois plus tard.
  nom_fichier    text not null,
  taille_octets  bigint  check (taille_octets > 0),
  duree_secondes integer check (duree_secondes > 0),
  format         text not null default 'fichier'
                 check (format in ('hls', 'fichier')),
  depose_par     text references utilisateurs (id) on delete set null on update cascade,
  depose_le      timestamptz not null default now(),
  maj_le         timestamptz not null default now()
);

create trigger videos_maj_le before update on videos
  for each row execute function touch_maj_le();

comment on table videos is
  'Médiathèque : un objet déposé dans le stockage, réutilisable par plusieurs chapitres. La clé nomme le dossier et ne change jamais — la renommer imposerait de recopier le fichier entier.';
comment on column videos.nom is
  'Titre affiché dans la médiathèque. Vaut le nom du fichier au dépôt, se renomme ensuite librement.';
comment on column videos.format is
  'hls = dossier de manifestes produit par ffmpeg (démonstrations historiques) ; fichier = MP4 unique déposé depuis l''administration.';

alter table videos enable row level security;
revoke all on videos from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Le lien depuis les chapitres
--
-- `on delete set null` et non `restrict` : l'effacement d'une vidéo encore
-- utilisée est déjà refusé par l'application, qui sait nommer les chapitres
-- concernés. Ici, la garde ne servirait qu'à produire une erreur illisible.
-- ---------------------------------------------------------------------------

alter table chapitres
  add column video_id uuid references videos (id) on delete set null;

create index chapitres_video_id_idx on chapitres (video_id) where video_id is not null;

-- ---------------------------------------------------------------------------
-- L'unicité de la clé change de table
--
-- `chapitres_video_cle_unique` datait de l'époque où une vidéo appartenait à un
-- chapitre et à un seul. Elle interdit très exactement ce que la médiathèque
-- permet : deux chapitres servant le même fichier. La laisser en place faisait
-- échouer tout rattachement d'une vidéo déjà employée, sur une violation de
-- contrainte que rien dans le message ne rattachait à la cause.
--
-- L'unicité n'est pas perdue pour autant : elle vit désormais sur `videos.cle`,
-- où elle a son vrai sens — une entrée par objet du stockage. Ici, il ne reste
-- qu'un index de recherche, que la lecture d'un chapitre par sa clé emprunte.
-- ---------------------------------------------------------------------------

alter table chapitres drop constraint if exists chapitres_video_cle_unique;

create index if not exists chapitres_video_cle_idx
  on chapitres (video_cle) where video_cle is not null;

comment on column chapitres.video_id is
  'Entrée de médiathèque servie par ce chapitre. Les colonnes video_cle, video_format, video_duree_secondes, video_nom_fichier et video_taille_octets en sont la copie, tenue à jour au rattachement pour éviter une jointure sur le chemin de lecture.';

-- ---------------------------------------------------------------------------
-- Reprise de l'existant
--
-- Chaque chapitre portant déjà une clé fonde une entrée. Le regroupement par
-- clé n'est pas une précaution théorique : rien n'interdisait à deux chapitres
-- de partager une clé posée à la main, et `insert … select` sans `group by`
-- buterait alors sur l'unicité.
-- ---------------------------------------------------------------------------

insert into videos (cle, nom, nom_fichier, taille_octets, duree_secondes, format, depose_le)
select
  c.video_cle,
  -- Sans nom de fichier — les flux transcodés à la main n'en ont pas —, la clé
  -- fait un titre acceptable, que l'équipe pourra renommer.
  coalesce(min(c.video_nom_fichier), c.video_cle),
  coalesce(min(c.video_nom_fichier), c.video_cle),
  max(c.video_taille_octets),
  max(c.video_duree_secondes),
  coalesce(min(c.video_format), 'fichier'),
  coalesce(min(c.video_importee_le), now())
from chapitres c
where c.video_cle is not null
group by c.video_cle;

update chapitres c
   set video_id = v.id
  from videos v
 where v.cle = c.video_cle
   and c.video_cle is not null;

-- Une clé sans entrée de médiathèque laisserait un chapitre que la médiathèque
-- ne connaît pas : la vidéo se lirait, mais son effacement échapperait au
-- décompte des usages.
alter table chapitres
  add constraint chapitres_video_id_requis
    check (video_cle is null or video_id is not null);
