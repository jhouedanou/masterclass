-- Textes du catalogue alignés sur l'offre réelle (20/10/2026).
--
-- « de 60 minutes » : les modules pilotes durent de 43 à 60 minutes.
-- « valider une idée, fixer vos prix » : ces deux modules ne sont pas
-- disponibles ; la phrase annonce désormais ce que le programme couvre.
-- Le décompte {modules} reste un jeton, calculé sur les modules disponibles.
begin;

update programmes set
  description_hero      = replace(replace(replace(description_hero,      'de 60 minutes', 'd’une heure au plus'), 'valider une idée, fixer vos prix, vendre', 'lancer une offre, vendre'), 'valider une idée, fixer ses prix, vendre', 'lancer une offre, vendre'),
  seo_title             = replace(replace(replace(seo_title,             'de 60 minutes', 'd’une heure au plus'), 'valider une idée, fixer vos prix, vendre', 'lancer une offre, vendre'), 'valider une idée, fixer ses prix, vendre', 'lancer une offre, vendre'),
  seo_meta_description  = replace(replace(replace(seo_meta_description,  'de 60 minutes', 'd’une heure au plus'), 'valider une idée, fixer vos prix, vendre', 'lancer une offre, vendre'), 'valider une idée, fixer ses prix, vendre', 'lancer une offre, vendre'),
  seo_og_title          = replace(replace(replace(seo_og_title,          'de 60 minutes', 'd’une heure au plus'), 'valider une idée, fixer vos prix, vendre', 'lancer une offre, vendre'), 'valider une idée, fixer ses prix, vendre', 'lancer une offre, vendre'),
  seo_og_description    = replace(replace(replace(seo_og_description,    'de 60 minutes', 'd’une heure au plus'), 'valider une idée, fixer vos prix, vendre', 'lancer une offre, vendre'), 'valider une idée, fixer ses prix, vendre', 'lancer une offre, vendre');

update reglages_seo set
  description_par_defaut = replace(description_par_defaut, 'Des modules de 60 minutes', 'Des modules d’une heure au plus');

commit;

-- « Choisissez parmi 1 module » se lit mal : la phrase commence désormais par
-- le décompte, juste au singulier comme au pluriel.
begin;
update programmes set description_hero = replace(description_hero, 'Choisissez parmi {modules} d’une heure au plus', '{modules} d’une heure au plus');
commit;
