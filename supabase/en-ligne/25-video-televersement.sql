-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — video televersement
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 25 sur 33 · source : 20260927120000_video_televersement.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Téléversement des vidéos et import des transcriptions
--
-- Jusqu'ici une vidéo n'arrivait sur un chapitre que par la ligne de commande :
-- transcodage sur un poste équipé de ffmpeg, dépôt par wrangler, puis un UPDATE
-- tapé à la main. Les dix-huit tournages ne pouvaient donc pas être mis en
-- ligne par l'équipe éditoriale.
--
-- Le parti retenu supprime le transcodage : le formateur ou l'administrateur
-- livre un MP4 déjà optimisé pour le web, et la plateforme se contente de le
-- recevoir, de le ranger et de le servir. D'où une distinction nouvelle entre
-- les deux formes que peut prendre une vidéo :
--
--   'hls'     — un dossier de manifestes et de segments, produit par ffmpeg.
--               C'est la forme des deux vidéos de démonstration.
--   'fichier' — un MP4 unique déposé depuis l'administration.
--
-- Le lecteur doit savoir laquelle il a en face de lui : il ne demande pas le
-- même fichier au CDN et n'emprunte pas le même chemin côté navigateur.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Chapitres : d'où vient la vidéo, d'où vient le script
-- ---------------------------------------------------------------------------

alter table chapitres
  add column video_format        text,
  add column video_nom_fichier   text,
  add column video_taille_octets bigint,
  add column video_importee_le   timestamptz,
  add column script_format       text,
  add column script_nom_fichier  text,
  add column script_importe_le   timestamptz;

-- Les lignes existantes sont mises en conformité AVANT la contrainte.
-- L'ordre inverse passe sur une base neuve — le jeu de données arrive après les
-- migrations, la table est donc vide — et échoue sur une base en service, où
-- des chapitres portent déjà une clé vidéo.

-- Les vidéos déjà en place sont antérieures à ce choix : elles sont en HLS.
update chapitres set video_format = 'hls' where video_cle is not null;

-- Les scripts du jeu de démonstration ont été saisis à la main.
update chapitres
   set script_format = 'manuel'
 where jsonb_array_length(script) > 0;

alter table chapitres
  add constraint chapitres_video_format_valeurs
    check (video_format is null or video_format in ('hls', 'fichier')),
  add constraint chapitres_video_taille_positive
    check (video_taille_octets is null or video_taille_octets > 0),
  -- Une clé sans format est illisible : le lecteur ne saurait pas quoi demander
  -- au diffuseur, ni par quel chemin la lire.
  add constraint chapitres_video_format_requis
    check (video_cle is null or video_format is not null),
  add constraint chapitres_script_format_valeurs
    check (script_format is null or script_format in ('srt', 'vtt', 'manuel'));

comment on column chapitres.video_format is
  'hls = dossier de manifestes produit par ffmpeg (démonstrations historiques) ; fichier = MP4 unique déposé depuis l''administration. Décide du fichier demandé au diffuseur et du chemin de lecture côté navigateur.';
comment on column chapitres.video_taille_octets is
  'Poids du MP4 déposé. Nul pour un flux HLS, dont le poids est réparti sur des centaines de fichiers.';
comment on column chapitres.script_format is
  'Origine de la transcription : fichier SRT ou VTT importé, ou saisie manuelle.';

-- ---------------------------------------------------------------------------
-- 2. Modules : filigrane et téléchargement
--
-- Les deux cases de l'écran 09. `telechargement_bloque` n'est pas une garantie
-- technique et il vaut mieux l'écrire que le laisser croire : avec un fichier
-- unique, l'URL signée reste récupérable pendant les quatre heures de sa
-- validité. La case gouverne l'affichage d'un bouton de téléchargement ; la
-- protection réelle tient au filigrane nominatif, à la durée du jeton et à
-- l'attribut `controlslist` du lecteur.
-- ---------------------------------------------------------------------------

alter table modules
  add column telechargement_bloque boolean not null default true,
  add column filigrane_actif       boolean not null default true;

comment on column modules.telechargement_bloque is
  'Masque tout bouton de téléchargement. N''empêche pas un enregistrement d''écran ni la récupération de l''URL signée : c''est le filigrane nominatif qui rend une rediffusion attribuable.';
comment on column modules.filigrane_actif is
  'Filigrane nominatif (nom et e-mail) en surimpression du lecteur. Désactivable pour une vidéo de démonstration publique.';

-- ---------------------------------------------------------------------------
-- 3. Téléversements en cours
--
-- Un fichier de plusieurs centaines de mégaoctets part du navigateur vers le
-- stockage d'objets en parts de seize mégaoctets. Chaque part accuse réception
-- par une étiquette, et la finalisation exige la liste complète de ces
-- étiquettes.
--
-- Or l'interface du stockage d'objets exposée aux Workers ne sait pas relister
-- les parts d'un téléversement en cours. Perdues, elles sont irrécupérables :
-- si elles ne vivaient que dans le navigateur, un cache vidé condamnerait un
-- dépôt de sept cents mégaoctets à tout recommencer. D'où cette table, qui
-- sert aussi à purger les dépôts abandonnés — les parts déjà poussées sont
-- facturées tant qu'elles ne sont pas explicitement abandonnées.
-- ---------------------------------------------------------------------------

create table televersements_video (
  id                 uuid primary key default gen_random_uuid(),
  chapitre_id        uuid not null references chapitres (id) on delete cascade,
  cle                text not null,
  upload_id          text not null,
  nom_fichier        text not null,
  taille_octets      bigint  not null check (taille_octets > 0),
  -- Le stockage impose des parts égales d'au moins cinq mégaoctets : la taille
  -- est donc fixée à l'ouverture et ne peut plus changer en cours de route.
  taille_part_octets integer not null check (taille_part_octets >= 5242880),
  nb_parts           integer not null check (nb_parts between 1 and 10000),
  duree_secondes     integer check (duree_secondes > 0),
  -- [{ "n": 1, "etag": "…" }] — irrécupérable ailleurs.
  parts              jsonb   not null default '[]'::jsonb,
  statut             text    not null default 'en-cours'
                     check (statut in ('en-cours', 'termine', 'abandonne')),
  ouvert_par         text references utilisateurs (id) on delete set null on update cascade,
  cree_le            timestamptz not null default now(),
  maj_le             timestamptz not null default now()
);

-- Un seul dépôt vivant par chapitre : deux dépôts concurrents laisseraient
-- derrière eux un téléversement orphelin, facturé sans que rien ne le montre.
create unique index televersements_video_actif_idx
  on televersements_video (chapitre_id) where statut = 'en-cours';

-- Les dépôts à purger, du plus ancien au plus récent.
create index televersements_video_purge_idx
  on televersements_video (cree_le) where statut = 'en-cours';

create trigger televersements_video_maj_le before update on televersements_video
  for each row execute function touch_maj_le();

comment on table televersements_video is
  'Téléversement en cours d''un MP4 de chapitre. Porte les étiquettes des parts déjà poussées, que le stockage d''objets ne sait pas relister depuis un Worker.';

alter table televersements_video enable row level security;
revoke all on televersements_video from anon, authenticated;
