-- Rattrapage : Image sociale par défaut en PNG
--
-- WhatsApp, Facebook et LinkedIn ne lisent pas le SVG en `og:image` : toute
-- page sans image propre se partageait sans vignette. Le fichier
-- `public/images/og-default.png` (1200 × 630) remplace le SVG.
--
-- À exécuter une fois dans SQL Editor. Sans effet si la valeur a déjà changé.

update reglages_seo
   set image_sociale_par_defaut = '/images/og-default.png'
 where image_sociale_par_defaut = '/images/og-default.svg';
