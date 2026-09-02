-- ---------------------------------------------------------------------------
-- Rattachement des vidéos de démonstration — base déjà peuplée
--
-- Le jeu de données (99-donnees.sql) porte désormais les clés vidéo, mais il ne
-- se rejoue pas sur une base installée. Ce fichier pose les mêmes valeurs sur
-- les chapitres existants, sans rien écraser d'autre.
--
-- À exécuter dans SQL Editor après 06-video.sql.
-- Sans effet sur un chapitre qui a déjà une vidéo.
-- ---------------------------------------------------------------------------

update chapitres set video_cle = 'demo-accroches-ch01', video_duree_secondes = 31
 where module_id = 'mod-accroches-qui-stoppent-le-scroll-et-ia-copywriting'
   and position = 0
   and video_cle is null;

update chapitres set video_cle = 'demo-accroches-ch02', video_duree_secondes = 31
 where module_id = 'mod-accroches-qui-stoppent-le-scroll-et-ia-copywriting'
   and position = 1
   and video_cle is null;
