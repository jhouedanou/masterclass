-- ---------------------------------------------------------------------------
-- Fiche formateur : présentation et LinkedIn (brief du 02/11)
--
-- La nouvelle maquette sépare une présentation courte, en tête de fiche, de
-- la biographie (`bio`, déjà en place), et ajoute le lien LinkedIn. Les deux
-- sont facultatifs : une fiche sans eux s'affiche comme avant.
-- ---------------------------------------------------------------------------

alter table formateurs
  add column presentation text not null default '',
  add column linkedin text
    check (linkedin is null or linkedin ~ '^https://([a-z]{2,3}\.)?(www\.)?linkedin\.com/');

comment on column formateurs.presentation is 'Présentation courte, en tête de la fiche publique.';
comment on column formateurs.linkedin is 'Profil LinkedIn public (https://…linkedin.com/…).';
