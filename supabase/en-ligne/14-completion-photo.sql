-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — completion photo
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 14 sur 18 · source : 20260920120000_completion_photo.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- La photo entre dans la complétion du profil apprenant
--
-- `shared/utils/profil.ts` compte désormais la photo parmi les champs communs
-- (`CHAMPS_COMMUNS`). Le pourcentage affiché est recalculé à chaque lecture,
-- mais `fiche_completee` — la colonne que lit `reserver_place_session`
-- (EM403) — n'est écrite qu'au moment d'un enregistrement.
--
-- Sans ce rattrapage, un apprenant complet avant la règle garderait l'accès
-- aux coaching sessions jusqu'à sa prochaine sauvegarde, alors qu'un autre le
-- perdrait aussitôt : la règle ne serait uniforme que sur l'affichage.
--
-- Effet voulu et assumé : les comptes apprenants sans photo repassent sous les
-- 100 % et ne peuvent plus réserver de place tant qu'ils n'en ont pas déposé
-- une. Les formateurs et les comptes d'administration ne sont pas concernés —
-- la fiche apprenant ne les gouverne pas.
-- ---------------------------------------------------------------------------

update utilisateurs
   set fiche_completee = false
 where role = 'apprenant'
   and photo is null
   and fiche_completee;
