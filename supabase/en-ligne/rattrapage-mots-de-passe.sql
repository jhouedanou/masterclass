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

update utilisateurs set mot_de_passe_hache = 'scrypt$16384$8$1$03f22dc4d30f7f3cc9aa28d1fc9c1a89$7bac4358d1e299b17ad7ff86313f8536b56522dc48c87aa320be2dcc375dc7510e3b9546e7e93acee8445cd6763a3f71f78826ba717c20035b7079f3e3c80b39'
 where id = 'usr-aya' and mot_de_passe_hache is null;
update utilisateurs set mot_de_passe_hache = 'scrypt$16384$8$1$74ae5112a35a1cd961e48cc43cd2045f$ff8f19727abdcc7a32e257527b8e130da78ed2b1b7317726c11b5ad9df90cb0e4b3d3ac7163407b280699b2b4c3f154d262b6a5d0fb5a1caa6e59ffda1cee4d6'
 where id = 'usr-moussa' and mot_de_passe_hache is null;
update utilisateurs set mot_de_passe_hache = 'scrypt$16384$8$1$d69dbdbef733ef53065b9e80014128e8$4fee43ce2269371c262e1d6a1749efef797a8d8d69dc5b0d9d0b174c1d959d555f171edeb42553f04427b03cf90d030f37fdb1808b4deeea74956e33da2dfe6a'
 where id = 'usr-fatou' and mot_de_passe_hache is null;
update utilisateurs set mot_de_passe_hache = 'scrypt$16384$8$1$d08b2a1e2697b05534939d53897ec640$6427ac4c93b7e3be50894ef809219f1d8bf7b9a13ee1b6a3e7542e474b6b089bf53f9b8d1609f85fb3c098befaf39f3a839dfd9b0b8eb62819d832dff751cea9'
 where id = 'usr-admin' and mot_de_passe_hache is null;
update utilisateurs set mot_de_passe_hache = 'scrypt$16384$8$1$6401bfce479dc72a640b596bcc1533de$4d0705946478b91929e0c435fab417233eeb5d8211ae0bd4500ade650953c2c9c13b0f82d86cdf52a4383e54157026d25e79ba3a6ba5ff325c2f5ed6d367a0a1'
 where id = 'usr-editeur' and mot_de_passe_hache is null;
update utilisateurs set mot_de_passe_hache = 'scrypt$16384$8$1$cf685411a72619e2293f3d28e1ef6fd0$4e6bf2ed9a5a15adf225f4ce8cb0089505fc752e1fc85c96f7e5e23f882866e16af3d47cc7bcfa8f1934413fcba9af02afec6b4b0e88710ab57ad1dfce60d6d5'
 where id = 'usr-formateur' and mot_de_passe_hache is null;

-- Droits fins des comptes d'administration.
update utilisateurs set sections_autorisees = array['cms-site-vitrine', 'fiches-commerciales', 'modules-chapitres', 'formateurs', 'calendrier-sessions', 'coaching-prive', 'candidatures-formateurs', 'blog', 'referencement-contenu', 'historique-versions', 'statistiques-performance']::section_admin[]
 where id = 'usr-editeur' and cardinality(sections_autorisees) = 0;
