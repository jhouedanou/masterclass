-- ---------------------------------------------------------------------------
-- Décomptes dynamiques dans les textes des programmes — base déjà peuplée
--
-- « Choisissez parmi 9 modules » a été écrit une fois dans la base. Le jour où
-- un module a changé de programme, puis celui où neuf sont passés en brouillon,
-- la phrase a menti sans que rien ne le signale.
--
-- Le nombre laisse la place à un jeton. `server/utils/public.ts` le remplace au
-- moment de servir la page, par le décompte du jour — pages programme, page
-- d'accueil, carrousel et métadonnées comprises.
--
-- Les expressions régulières sont volontairement étroites : elles ne visent que
-- « N modules » précédé de « parmi », et le décompte en tête de la description
-- SEO. Un texte déjà porteur du jeton, ou réécrit autrement au back-office, est
-- laissé tel quel.
--
-- À exécuter dans SQL Editor, ou `npm run db:appliquer -- <ce fichier>`.
-- Rejouable : une seconde exécution ne trouve plus rien à remplacer.
-- ---------------------------------------------------------------------------

begin;

-- « Choisissez parmi 8 modules de 60 minutes… » → « parmi {modules} de… »
update programmes
   set description_hero = regexp_replace(description_hero, 'parmi \d+ modules?', 'parmi {modules}')
 where description_hero ~ 'parmi \d+ modules?';

-- « Huit modules de 60 minutes… » / « 10 modules de… » → « {modules} de… »
-- Le décompte ouvre la phrase : l'ancrage sur le début de chaîne évite de
-- toucher un « 10 000 FCFA par module » plus loin dans le même texte.
update programmes
   set seo_meta_description = regexp_replace(
         seo_meta_description,
         '^(Une|Deux|Trois|Quatre|Cinq|Six|Sept|Huit|Neuf|Dix|Onze|Douze|\d+) modules?',
         '{modules}'
       )
 where seo_meta_description ~ '^(Une|Deux|Trois|Quatre|Cinq|Six|Sept|Huit|Neuf|Dix|Onze|Douze|\d+) modules?';

commit;

-- ---------------------------------------------------------------------------
-- Contrôle : les deux colonnes doivent porter le jeton.
--
--   select slug,
--          description_hero ~ '\{modules\}'     as hero_ok,
--          seo_meta_description ~ '\{modules\}' as meta_ok
--     from programmes order by slug;
-- ---------------------------------------------------------------------------
