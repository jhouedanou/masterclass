-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — photo 512ko
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 13 sur 33 · source : 20260919120000_photo_512ko.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Photo de profil : plafond ramené à 512 ko
--
-- Le seau créé par `…_photo_profil.sql` acceptait deux mégaoctets. Un portrait
-- affiché au plus à 80 pixels de côté n'en a pas l'usage, et le dépôt part
-- souvent d'une connexion mobile : 512 ko suffisent largement et rendent
-- l'envoi immédiat.
--
-- La même borne est posée dans `server/utils/photos.ts` (`PHOTO_TAILLE_MAX`),
-- qui refuse le fichier avant même de l'envoyer au stockage. Celle-ci est le
-- second verrou, côté Supabase.
--
-- Migration distincte plutôt qu'une retouche de la précédente : les fichiers
-- de `supabase/en-ligne/` ne sont pas rejouables, et une base déjà installée
-- n'exécute que les numéros qui lui manquent.
-- ---------------------------------------------------------------------------

do $$
begin
  -- Le schéma `storage` n'existe que sur une instance Supabase : une base
  -- PostgreSQL nue (tests, intégration continue) passe outre.
  if to_regclass('storage.buckets') is null then
    raise notice 'Schéma storage absent : plafond du seau « photos-profil » inchangé.';
    return;
  end if;

  update storage.buckets
     set file_size_limit = 524288
   where id = 'photos-profil';
end;
$$;
