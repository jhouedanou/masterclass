-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — comptes admin
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 17 sur 22 · source : 20260921120200_comptes_admin.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Comptes d'administration réels
--
-- `admin@bigfive.ci` n'était rattaché à aucune boîte aux lettres : impossible
-- d'y recevoir le code à six chiffres de la connexion en deux étapes. Le compte
-- passe sur l'adresse de Jean-Luc Houedanou, et trois administrateurs
-- supérieurs sont ajoutés.
--
-- Aucun `sections_autorisees` : un administrateur supérieur voit tout le
-- back-office quoi qu'il arrive (voir `sectionsEffectives`, server/utils/session.ts).
--
-- Les empreintes reprennent le mot de passe commun de démonstration
-- (`Masterclass2026!`) et sont copiées de supabase/seed.sql. À changer avant
-- toute ouverture publique — voir TODO.md.
-- ---------------------------------------------------------------------------

-- Les deux blocs ne s'appliquent qu'à une base déjà peuplée. Sur une base
-- neuve, `utilisateurs` est encore vide à ce stade des migrations : c'est le
-- seed, exécuté ensuite, qui pose ces mêmes comptes.

update utilisateurs
   set email = 'jeanluc@bigfiveabidjan.com',
       prenom = 'Jean-Luc',
       nom = 'Houedanou'
 where id = 'usr-admin'
   and lower(email) = 'admin@bigfive.ci';

insert into utilisateurs (id, prenom, nom, email, role, mot_de_passe_hache)
select nouveaux.*
  from (values
    ('usr-cossi', 'Cossi', '(à compléter)', 'cossi@bigfiveabidjan.com',
     'admin-superieur'::role_utilisateur,
     'scrypt$16384$8$1$96f8b7b268b174c7fc3a41ec1bfafd98$f84948cb56e5b5f45a6c51b1a4fea244266567c41e06561e1afb9e410c59cf22336a1982a47aaf936513981c9af16b86f79ebc2daa0f7f91ce15af2b85f5fce0'),
    ('usr-declercq', 'Jérémie', 'De Clercq', 'jeremie.declercq@bigfiveabidjan.com',
     'admin-superieur'::role_utilisateur,
     'scrypt$16384$8$1$f689702966c06f5c25a2d7f4904f893a$363cb8c0eeb1a9239a60d8f141e42e06c77151b83e7efda59c8073ea30cf6e7c16e338e002b9bdff2e815ec2ec2b79a63db2be99ac5fc1cf22cf2252a6742ea2'),
    ('usr-houefa', 'Houéfa', '(à compléter)', 'houefa@bigfiveabidjan.com',
     'admin-superieur'::role_utilisateur,
     'scrypt$16384$8$1$36da771570462cabed573e37b20e204f$cb0bfdf65da9d423809734c07f768305f0af3d454b5ee82f43a743747543f8dde1e94aef639d0b29a14454b9149ce0466a56849f720dd32f6020966820f4de54')
  ) as nouveaux (id, prenom, nom, email, role, mot_de_passe_hache)
 where exists (select 1 from utilisateurs where id = 'usr-admin')
    on conflict do nothing;
