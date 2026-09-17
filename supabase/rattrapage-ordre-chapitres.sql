-- Rattrapage : ordre des chapitres
--
-- Le module « Comprendre le business du client » avait ses chapitres mélangés
-- en base — Chapitre 1, Introduction, Chapitre 3, Chapitre 2 — et sa fiche
-- publique les affichait dans cet ordre. Le code trie bien par `position` :
-- c'est la donnée qui était fausse, sur un module des dix-huit.
--
-- Deux passages : l'index unique (module_id, position) refuserait une
-- permutation directe, et une contrainte interdit les positions négatives. On
-- gare donc les lignes au-delà de 1000 avant de les reposer.
--
-- Appliqué le 16/09/2026. Rejouable sans effet : la requête ne retient que les
-- modules dont l'ordre diffère de l'ordre attendu.

create temporary table ordre_chapitres on commit drop as
select t.id, t.rang
from (
  select c.id,
         c.module_id,
         c.position,
         row_number() over (
           partition by c.module_id
           order by case when c.libelle ilike 'Introduction%' then 0 else 1 end,
                    nullif(regexp_replace(c.libelle, '\D', '', 'g'), '')::int nulls first
         ) - 1 as rang
  from chapitres c
) t
where t.module_id in (
  select module_id from (
    select c2.module_id,
           c2.position,
           row_number() over (
             partition by c2.module_id
             order by case when c2.libelle ilike 'Introduction%' then 0 else 1 end,
                      nullif(regexp_replace(c2.libelle, '\D', '', 'g'), '')::int nulls first
           ) - 1 as attendu
    from chapitres c2
  ) u where u.position <> u.attendu
);

update chapitres c set position = 1000 + o.rang
from ordre_chapitres o where o.id = c.id;

update chapitres c set position = o.rang
from ordre_chapitres o where o.id = c.id;
