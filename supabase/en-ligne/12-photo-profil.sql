-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — photo profil
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 12 sur 17 · source : 20260918120000_photo_profil.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Photo de profil de l'apprenant (planche B, écran 04)
--
-- Le fichier lui-même vit dans le stockage d'objets Supabase, pas en base :
-- l'hébergement applicatif n'a pas de disque persistant (voir le commentaire
-- « cron externe » de nuxt.config.ts), un fichier écrit à côté du serveur
-- disparaîtrait au déploiement suivant.
--
-- La colonne ne garde que le chemin dans le seau, jamais l'URL complète :
-- l'URL publique se reconstruit à partir de SUPABASE_URL (voir
-- `server/utils/photos.ts`), donc un changement de projet Supabase — bascule
-- de recette en production, restauration — n'oblige pas à réécrire chaque
-- ligne.
-- ---------------------------------------------------------------------------

alter table utilisateurs
  add column photo text;

comment on column utilisateurs.photo is
  'Chemin de la photo de profil dans le seau « photos-profil » (« usr-xxxxxx/<aléa>.jpg »), pas une URL. Nul tant que l''apprenant n''en a pas déposé : l''interface retombe alors sur ses initiales.';

-- ---------------------------------------------------------------------------
-- Seau de stockage
--
-- Public en lecture : la photo s'affiche dans l'en-tête de l'espace apprenant
-- et dans la fiche transmise au formateur, sans signature à renouveler. Le
-- chemin porte seize octets d'aléa, il ne s'énumère donc pas à partir de
-- l'identifiant du compte.
--
-- L'écriture, elle, reste fermée : aucune politique n'est posée sur
-- `storage.objects` — comme pour les tables métier (voir
-- `…_securite_rls.sql`), seule la clé secrète du serveur applicatif dépose ou
-- supprime un fichier, après contrôle de session.
--
-- Les bornes posées ici (taille, types) doublent celles de l'API : le seau
-- refuse de lui-même un fichier hors format, même si un appel venait à
-- contourner la validation applicative.
-- ---------------------------------------------------------------------------

do $$
begin
  -- Le schéma `storage` n'existe que sur une instance Supabase : une base
  -- PostgreSQL nue (tests, intégration continue) applique le reste sans lui.
  if to_regclass('storage.buckets') is null then
    raise notice 'Schéma storage absent : seau « photos-profil » non créé.';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('photos-profil', 'photos-profil', true, 2097152,
          array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do update set
    public             = excluded.public,
    file_size_limit    = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
end;
$$;
