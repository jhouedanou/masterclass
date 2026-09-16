-- Texte alternatif du portrait des formateurs (annexe technique, planche A
-- écran 14). Vide, l'affichage retombe sur un libellé construit sur le nom.

alter table formateurs add column if not exists photo_alt text;

comment on column formateurs.photo_alt is
  'Texte alternatif du portrait, éditable au back-office. Vide, un libellé construit sur le nom prend le relais.';
