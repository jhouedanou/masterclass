-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — couverture module
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 35 sur 40 · source : 20261007120000_couverture_module.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Image de couverture des modules
--
-- Dix-huit modules, deux visuels : la fiche module affichait
-- `/images/modules/<programme>.svg`, le même pour les neuf modules d'un
-- programme, et les cartes du catalogue n'affichaient rien du tout. Rien ne
-- distinguait « Fixer le juste prix » de « Négocier et conclure une vente ».
--
-- Le module porte donc sa propre image. Une seule, en 1200 × 630 : le format
-- qu'Open Graph réclame pour le partage, et que la fiche comme la carte
-- recadrent sans perte visible. Trois usages, un fichier à produire.
--
-- `image` garde une adresse affichable et non un chemin de seau, comme
-- `formateurs.photo` : une couverture peut aussi bien venir du stockage que
-- d'un fichier du site, et `cheminDansSeau` sait trier les deux avant
-- d'effacer quoi que ce soit.
-- ---------------------------------------------------------------------------

alter table modules
  add column image     text,
  add column image_alt text;

comment on column modules.image is
  'Couverture du module, 1200 × 630. Sert la fiche, la carte du catalogue et l''image de partage. Vide : la fiche retombe sur le visuel générique du programme.';
comment on column modules.image_alt is
  'Texte alternatif de la couverture. Vide, l''affichage retombe sur un libellé construit sur le titre du module.';

-- ---------------------------------------------------------------------------
-- Le seau
--
-- Mêmes bornes que les portraits : 2 Mo, JPEG, PNG ou WebP. Pas de SVG — un
-- SVG est un document qui peut porter du script, et servi depuis une origine
-- publique il l'exécuterait au nom du visiteur.
--
-- Les bornes posées ici doublent celles de l'API : le seau refuse de lui-même
-- un fichier hors format, même si un appel venait à contourner la validation
-- applicative.
-- ---------------------------------------------------------------------------

do $$
begin
  -- Le schéma `storage` n'existe que sur une instance Supabase : une base
  -- PostgreSQL nue (tests, intégration continue) applique le reste sans lui.
  if to_regclass('storage.buckets') is null then
    raise notice 'Schéma storage absent : seau « couvertures » non créé.';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('couvertures', 'couvertures', true, 2097152,
          array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do update set
    public             = excluded.public,
    file_size_limit    = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
end;
$$;
