-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — audience par reseau
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 20 sur 23 · source : 20260923120100_audience_par_reseau.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Une taille d'audience par réseau
--
-- « Taille d'audience approximative » était un choix unique pour toute la
-- fiche. Un apprenant qui gère Instagram, TikTok et LinkedIn n'a pourtant pas
-- la même audience sur les trois, et c'est précisément l'écart qui intéresse le
-- formateur avant une session.
--
-- La colonne `personas.audience` est conservée — pas de nouvelle colonne, pas
-- de `jsonb` : elle passe simplement d'une valeur unique à des paires
-- `reseau:tranche` séparées par des virgules, dans la même convention que les
-- autres champs à choix multiple. `renseigne()` continue donc de compter le
-- champ à l'identique, et les pourcentages de complétion ne bougent pas.
--
--     Moins de 1 000 abonnés   ->   instagram:moins-1k,tiktok:moins-1k
--
-- Le champ reste rempli dès qu'un seul réseau porte sa tranche : ajouter un
-- réseau ne doit pas faire retomber un profil sous 100 % et lui refermer
-- l'inscription aux sessions du jour au lendemain.
-- ---------------------------------------------------------------------------

insert into referentiels (id, categorie, cle, libelle, ordre) values
  ('ref-aud-moins-1k',  'audience', 'moins-1k',  'Moins de 1 000 abonnés',     10),
  ('ref-aud-1k-10k',    'audience', '1k-10k',    '1 000 à 10 000 abonnés',     20),
  ('ref-aud-10k-100k',  'audience', '10k-100k',  '10 000 à 100 000 abonnés',   30),
  ('ref-aud-plus-100k', 'audience', 'plus-100k', 'Plus de 100 000 abonnés',    40);

-- ---------------------------------------------------------------------------
-- Reprise de l'existant
--
-- La tranche unique déjà saisie est reportée sur chacun des réseaux que
-- l'apprenant a sélectionnés. C'est la seule lecture honnête de la donnée : on
-- sait qu'il déclarait cette audience, on ne sait pas comment elle se
-- répartissait.
--
-- Une fiche sans réseau sélectionné est laissée telle quelle : une audience
-- sans réseau auquel la rattacher ne peut pas être convertie, et l'effacer
-- reviendrait à supprimer la réponse de l'apprenant. Elle sera remplacée à son
-- prochain enregistrement.
-- ---------------------------------------------------------------------------

create or replace function pg_temp_sans_accent(valeur text)
returns text
language sql
immutable
as $$
  select translate(
    coalesce(valeur, ''),
    'àâäáãåçèéêëìíîïñòóôöõùúûüýÿÀÂÄÁÃÅÇÈÉÊËÌÍÎÏÑÒÓÔÖÕÙÚÛÜÝ',
    'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY'
  );
$$;

update personas p set audience = (
  select string_agg(btrim(reseau) || ':' || t.cle, ',')
  from unnest(string_to_array(p.reseaux, ',')) as reseau
  cross join lateral (
    select r.cle
    from referentiels r
    where r.categorie = 'audience'
      and lower(pg_temp_sans_accent(r.libelle)) = lower(pg_temp_sans_accent(btrim(p.audience)))
    limit 1
  ) as t
  where btrim(reseau) <> ''
)
where coalesce(p.audience, '') <> ''
  and coalesce(p.reseaux, '') <> ''
  -- Déjà sous forme de paires : rien à reprendre.
  and position(':' in p.audience) = 0
  -- Et seulement si la tranche correspond bien à une entrée du référentiel.
  and exists (
    select 1 from referentiels r
    where r.categorie = 'audience'
      and lower(pg_temp_sans_accent(r.libelle)) = lower(pg_temp_sans_accent(btrim(p.audience)))
  );

drop function pg_temp_sans_accent(text);
