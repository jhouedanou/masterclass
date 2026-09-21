-- ---------------------------------------------------------------------------
-- Contenus réels des modules — base déjà peuplée
--
-- Le jeu de données (99-donnees.sql) porte désormais l'arborescence réelle
-- issue du tableau « E-Masterclass Big Five — arborescence des modules et
-- découpage vidéo », mais il ne se rejoue pas sur une base installée. Ce
-- fichier applique les mêmes valeurs sur les lignes existantes.
--
-- Modules concernés (programme Social Média) :
--   1 · Comprendre le business du client        → 3 chapitres réels, puis
--       passe au programme Entrepreneurs sous le numéro 10
--   2 · Plan d'action social media : Stratégie  → 5 chapitres réels (2 créés)
--   3 · Plan d'action social media : Planning   → 3 chapitres réels
--   4 · Formules de rédaction persuasive        → intitulé et 3 chapitres réels
--   8 · Instagram → LinkedIn : Algorithme & Optimisation du profil
--
-- Les chapitres sont mis à jour en place, jamais supprimés : leur identifiant
-- porte les vidéos déjà déposées et la progression des apprenants. Ce fichier
-- ne touche à aucune vidéo — elles appartiennent à la médiathèque.
--
-- À exécuter dans SQL Editor après 99-donnees.sql. Rejouable.
-- ---------------------------------------------------------------------------

begin;

-- ---------------------------------------------------------------------------
-- Module 8 : l'identifiant change (cascade sur accès, commandes, certificats)
-- ---------------------------------------------------------------------------

update modules set
  id        = 'mod-linkedin-algorithme-et-optimisation-du-profil',
  slug      = 'linkedin-algorithme-et-optimisation-du-profil',
  titre     = 'LinkedIn : Algorithme & Optimisation du profil',
  promesse  = 'Comprenez le moteur de distribution de LinkedIn, puis réglez votre profil pour qu''il travaille en votre faveur à chaque publication.',
  pourquoi  = 'Depuis 360Brew, LinkedIn ne distribue plus les publications selon les mêmes règles : le profil est lu en même temps que le post. Ce module explique la nouvelle logique de distribution, puis transforme cette compréhension en réglages concrets et en un plan d''action 48h.',
  pour_qui  = array[
    'Vous publiez sur LinkedIn sans comprendre pourquoi la portée varie.',
    'Votre profil reçoit des visites qui ne débouchent sur rien.',
    'Vous voulez agir vite, sans refondre toute votre présence.'
  ]::text[],
  prerequis = 'Disposer d''un profil LinkedIn actif.',
  acquis    = array[
    'comprendre le moteur de distribution avant de vouloir le nourrir ;',
    'régler chaque bloc du profil que l''algorithme lit avec vos posts ;',
    'dérouler un plan d''action en 48h.'
  ]::text[],
  livrable  = 'Un profil LinkedIn optimisé bloc par bloc et un plan d''action 48h.'
 where id = 'mod-instagram-formats-et-croissance';

-- L'ancienne URL publique doit continuer de répondre (spec SEO §5).
insert into redirections (de, vers) values
  ('/modules/instagram-formats-et-croissance', '/modules/linkedin-algorithme-et-optimisation-du-profil')
 on conflict (de) do nothing;

-- ---------------------------------------------------------------------------
-- Modules 2 et 4 : intitulé et acquis
-- ---------------------------------------------------------------------------

update modules set
  acquis = array[
    'poser un diagnostic factuel en cinq analyses ;',
    'fixer des objectifs mesurables de notoriété, d''engagement, de conversion et de fidélisation ;',
    'choisir ses plateformes, ses piliers éditoriaux et son ton ;',
    'déployer des tactiques concrètes et arbitrer organique contre payant.'
  ]::text[]
 where id = 'mod-plan-daction-social-media-strategie-et-ciblage';

update modules set
  acquis   = array[
    'poser la stratégie qui structure son calendrier éditorial ;',
    'construire un calendrier sur trente jours ;',
    'présenter son plan à un décideur.'
  ]::text[],
  livrable = 'Un calendrier éditorial de trente jours et la trame pour le présenter à un décideur.'
 where id = 'mod-plan-daction-social-media-planning-editorial';

update modules set
  titre  = 'Formules de rédaction persuasive & adapt. plateforme',
  acquis = array[
    'appuyer un message sur les ressorts de la persuasion ;',
    'adapter un même contenu au format de chaque plateforme ;',
    'appliquer les formules de rédaction incontournables.'
  ]::text[]
 where id = 'mod-formules-de-redaction-persuasive';

-- ---------------------------------------------------------------------------
-- Chapitres
--
-- L'introduction porte partout le même intitulé, aligné sur le tableau
-- (« présentation, contexte et objectif du module »).
-- ---------------------------------------------------------------------------

update chapitres set titre = 'Présentation, contexte et objectifs du module'
 where position = 0
   and titre = 'Présentation du module et de votre formateur';

-- La position 0 est l'introduction : un chapitre créé depuis l'administration
-- s'y est retrouvé libellé « Chapitre 0 », ce que l'apprenant lit tel quel.
update chapitres set libelle = 'Introduction'
 where position = 0
   and libelle <> 'Introduction';

-- Les chapitres réels, par module et par position. La durée estimée répartit
-- les 54 minutes restantes sur le nombre de chapitres du module.
update chapitres as c set titre = v.titre, duree_minutes = v.duree
  from (values
    ('mod-comprendre-le-business-du-client', 1, 'Comprendre avant de créer', 18),
    ('mod-comprendre-le-business-du-client', 2, 'L’entreprise et son modèle', 18),
    ('mod-comprendre-le-business-du-client', 3, 'L’histoire de l’entreprise', 18),

    ('mod-plan-daction-social-media-strategie-et-ciblage', 1, 'Diagnostic', 11),
    ('mod-plan-daction-social-media-strategie-et-ciblage', 2, 'Objectifs mesurables', 11),
    ('mod-plan-daction-social-media-strategie-et-ciblage', 3, 'Construire la stratégie', 11),

    ('mod-plan-daction-social-media-planning-editorial', 1, 'Stratégie du calendrier éditorial', 18),
    ('mod-plan-daction-social-media-planning-editorial', 2, 'Construire son calendrier en 30 jours', 18),
    ('mod-plan-daction-social-media-planning-editorial', 3, 'Présenter son plan à un décideur', 18),

    ('mod-formules-de-redaction-persuasive', 1, 'Fondements de la persuasion rédactionnelle', 18),
    ('mod-formules-de-redaction-persuasive', 2, 'Adapter sa rédaction aux plateformes', 18),
    ('mod-formules-de-redaction-persuasive', 3, 'Les formules de rédaction incontournables', 18),

    ('mod-linkedin-algorithme-et-optimisation-du-profil', 1, '360Brew et la Nouvelle logique de distribution', 18),
    ('mod-linkedin-algorithme-et-optimisation-du-profil', 2, 'Optimisation du profil, votre passeport algorithmique', 18),
    ('mod-linkedin-algorithme-et-optimisation-du-profil', 3, 'Plan d’action 48h & Q&R', 18)
  ) as v (module_id, position, titre, duree)
 where c.module_id = v.module_id and c.position = v.position;

-- L'introduction du module 2 suit la même répartition que ses chapitres.
update chapitres set duree_minutes = 6
 where module_id = 'mod-plan-daction-social-media-strategie-et-ciblage'
   and position = 0;

-- Le module 2 passe de 3 à 5 chapitres : les deux derniers n'existent pas.
insert into chapitres (module_id, position, libelle, titre, duree_minutes)
values
  ('mod-plan-daction-social-media-strategie-et-ciblage', 4, 'Chapitre 4', 'Les Tactiques', 11),
  ('mod-plan-daction-social-media-strategie-et-ciblage', 5, 'Chapitre 5', 'Mesure & Budget', 11)
 on conflict (module_id, position) do update
    set libelle = excluded.libelle,
        titre = excluded.titre,
        duree_minutes = excluded.duree_minutes;

-- ---------------------------------------------------------------------------
-- « Comprendre le business du client » rejoint le programme Entrepreneurs
--
-- Le slug ne bouge pas : l'URL publique /modules/<slug> ne dépend pas du
-- programme, aucune redirection n'est nécessaire.
-- ---------------------------------------------------------------------------

update modules set
  programme     = 'entrepreneurs',
  thematique_id = 'th-ent-fondations',
  numero        = 10,
  promesse      = 'Apprenez à lire une entreprise avant de lui proposer quoi que ce soit : son modèle, son histoire et ce qui la fait vivre.',
  pourquoi      = 'On propose souvent une solution avant d''avoir compris l''activité qu''elle est censée servir. Ce module donne la grille de lecture qui permet de comprendre un modèle économique, ses marges et ses priorités, puis d''en déduire ce dont l''entreprise a réellement besoin.',
  pour_qui      = array[
    'Vous vendez une prestation à des entreprises.',
    'Vos recommandations sont difficiles à défendre en réunion.',
    'Vous souhaitez relier vos propositions aux objectifs commerciaux du client.'
  ]::text[],
  acquis        = array[
    'analyser le modèle économique d''une entreprise ;',
    'identifier ses priorités commerciales ;',
    'formuler une proposition alignée sur ses objectifs.'
  ]::text[],
  livrable      = 'Une fiche de cadrage client réutilisable pour chaque nouvelle entreprise ou chaque nouveau projet.'
 where id = 'mod-comprendre-le-business-du-client';

-- Décomptes affichés sur les deux pages programme : 8 d'un côté, 10 de l'autre.
update programmes set
  description_hero     = replace(description_hero, 'parmi 9 modules', 'parmi 8 modules'),
  seo_meta_description = replace(seo_meta_description, 'Neuf modules', 'Huit modules')
 where slug = 'social-media';

update programmes set
  description_hero     = replace(description_hero, 'parmi 9 modules', 'parmi 10 modules'),
  seo_meta_description = replace(seo_meta_description, 'Neuf modules', 'Dix modules')
 where slug = 'entrepreneurs';

-- ---------------------------------------------------------------------------
-- Vidéos
--
-- Rien ici. Depuis la médiathèque, un chapitre ne peut plus porter une clé de
-- flux seule : `chapitres_video_id_requis` exige une entrée de médiathèque en
-- face. Les vidéos se déposent donc depuis l'administration, qui crée l'entrée
-- et la clé d'un seul geste. Les durées mesurées sur les rushs, que ce fichier
-- posait auparavant, viennent du téléversement.
-- ---------------------------------------------------------------------------

commit;
