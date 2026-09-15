-- ---------------------------------------------------------------------------
-- Ordre d'affichage des formateurs sur la page publique
--
-- L'écran 11 montre une poignée de glisser-déposer à côté de chaque formateur,
-- et l'API renvoyait jusqu'ici l'index de la boucle : la poignée ne commandait
-- rien, et l'ordre public suivait l'ordre d'insertion en base.
-- ---------------------------------------------------------------------------

alter table formateurs
  add column position integer;

-- L'ordre de départ est celui qui était affiché : par nom, comme le faisait la
-- lecture du catalogue.
update formateurs f
   set position = c.rang - 1
  from (select id, row_number() over (order by nom, id) as rang from formateurs) c
 where c.id = f.id;

alter table formateurs
  alter column position set not null,
  alter column position set default 0;

create index formateurs_ordre_idx on formateurs (position);

comment on column formateurs.position is
  'Ordre d''affichage sur /formateurs et dans les listes du back-office, piloté par le glisser-déposer de l''écran 11.';
