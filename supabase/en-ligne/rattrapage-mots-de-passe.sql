-- ---------------------------------------------------------------------------
-- Rattrapage — mots de passe des comptes de démonstration
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main. Régénération : npm run db:seed:generer
--
-- À exécuter une seule fois, sur une base installée AVANT la migration
-- d'authentification : ses comptes existaient sans mot de passe.
--
-- Sans effet sur un compte qui en a déjà un.
-- ---------------------------------------------------------------------------

update utilisateurs set mot_de_passe_hache = 'scrypt$16384$8$1$a22826f2045a3ce56c8ced828516748c$995728a7e90841bbe8088e4c5370161fc400a087f501bc95dd55bf2195f3010c03177023ed87f252ac4430ab80908d703ea2aa6378442c5cdc96ffe6933be92b'
 where id = 'usr-aya' and mot_de_passe_hache is null;
update utilisateurs set mot_de_passe_hache = 'scrypt$16384$8$1$b977e801947a3cda9dc6c5a707394ea6$040cac9c2794a5ccb2aa79b4285755262e4fc312da4f06af069d80a058c2a2a8a16796941713c0f1a265f0e2a8ff9fb8a30c562a0011f819bd7a4b7b64b7efc6'
 where id = 'usr-moussa' and mot_de_passe_hache is null;
update utilisateurs set mot_de_passe_hache = 'scrypt$16384$8$1$8472433c6d1c39bc03ad355160dbfa86$90a4ff26b70745b2c3aa8a7e208f234742da8712fa8d8909f4e55d0ab56538f5f5d0f12450ec80c3160724de1a325e05ba734753093435a0214c069423122894'
 where id = 'usr-fatou' and mot_de_passe_hache is null;
update utilisateurs set mot_de_passe_hache = 'scrypt$16384$8$1$e486c0557a0da8463ebd7f3cbc8e4f83$54b5d095859db59145ebe4f2a80ac335d51adaea0e9b7203cfcbcfb3fe008d20a1ef8f278f555a095b83529a3169657878c3639639a162785b67f0673d360119'
 where id = 'usr-admin' and mot_de_passe_hache is null;
update utilisateurs set mot_de_passe_hache = 'scrypt$16384$8$1$e34740232b28a7676399bb2d5946831d$1c0f08fdae6c17466551afcb52f5b83775180b912e175b20028b98d3758472a3b0703abb1eab08e73b676051b8a77ec7e06af2dff81bef753318d625529ff4ff'
 where id = 'usr-editeur' and mot_de_passe_hache is null;
update utilisateurs set mot_de_passe_hache = 'scrypt$16384$8$1$b84ca1e1a26d95d8a61dc9c159b3f279$a50c771bf3bdeacb378ff814395346665cf5db175a0f365a74f04b4a8436d88f2c2ad2bb184e375fbad329a65e5b954f69352226d2fc39f80fafdfc6d3a3878a'
 where id = 'usr-formateur' and mot_de_passe_hache is null;

-- Droits fins des comptes d'administration.
update utilisateurs set sections_autorisees = array['cms-site-vitrine', 'fiches-commerciales', 'modules-chapitres', 'formateurs', 'calendrier-sessions', 'coaching-prive', 'candidatures-formateurs', 'blog', 'referencement-contenu', 'historique-versions', 'statistiques-performance']::section_admin[]
 where id = 'usr-editeur' and cardinality(sections_autorisees) = 0;
