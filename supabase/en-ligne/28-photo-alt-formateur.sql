-- 28 · Texte alternatif du portrait des formateurs
--
-- L'annexe technique (planche A, écran 14) demande un texte alternatif
-- éditable pour chaque image éditoriale. Le blog l'avait déjà ; les portraits
-- de formateurs, non : leur `alt` était fabriqué à partir du nom, ce qui ne
-- décrit pas l'image et ne se corrige depuis aucun écran.
--
-- Colonne facultative : vide, l'affichage retombe sur « Portrait de {nom} ».

alter table formateurs add column if not exists photo_alt text;

comment on column formateurs.photo_alt is
  'Texte alternatif du portrait, éditable au back-office. Vide, un libellé construit sur le nom prend le relais.';
