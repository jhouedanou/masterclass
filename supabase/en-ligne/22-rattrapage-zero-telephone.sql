-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — rattrapage zero telephone
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 22 sur 32 · source : 20260924120000_rattrapage_zero_telephone.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Rattrapage : le zéro perdu des numéros ivoiriens et béninois
--
-- `versE164` retirait le zéro de tête de tout numéro, quel que soit le pays :
--
--     return `+${pays.indicatif}${brut.replace(/^0+/, '')}`
--
-- C'est juste là où ce zéro est un préfixe interurbain — France, Belgique,
-- Ghana, Nigeria — et faux en Côte d'Ivoire et au Bénin, passés à dix chiffres,
-- où il appartient au numéro. Un apprenant saisissait « 07 48 34 82 21 » et la
-- fiche enregistrait `+225748348221` : neuf chiffres, un numéro qui ne joint
-- personne. Le champ le lui réaffichait ensuite en « 74 83 48 22 1 ».
--
-- `shared/utils/telephone.ts` distingue désormais les deux cas. Restent les
-- numéros déjà amputés, que voici.
--
-- Le repérage ne laisse pas de place au doute : ni la Côte d'Ivoire ni le Bénin
-- n'ont jamais eu de numéro national à neuf chiffres — huit avant la bascule,
-- dix depuis. Un numéro à neuf chiffres ne peut donc venir que de cette
-- troncature, et le zéro rendu reconstitue exactement la saisie d'origine.
--
-- Les numéros à huit chiffres sont laissés tels quels : ce sont d'anciennes
-- saisies d'avant la bascule, pas des victimes du bug. Leur reprise relève d'un
-- autre chantier — au Bénin elle demande de préfixer « 01 », ce qu'on ne peut
-- pas deviner ici.
-- ---------------------------------------------------------------------------

update utilisateurs
set whatsapp = '+225' || '0' || substring(regexp_replace(whatsapp, '\D', '', 'g') from 4)
where regexp_replace(whatsapp, '\D', '', 'g') ~ '^225\d{9}$';

update utilisateurs
set whatsapp = '+229' || '0' || substring(regexp_replace(whatsapp, '\D', '', 'g') from 4)
where regexp_replace(whatsapp, '\D', '', 'g') ~ '^229\d{9}$';

-- Les formateurs saisissent leur WhatsApp par le même champ (planche D, écran 02).
update formateurs
set whatsapp = '+225' || '0' || substring(regexp_replace(whatsapp, '\D', '', 'g') from 4)
where whatsapp is not null
  and regexp_replace(whatsapp, '\D', '', 'g') ~ '^225\d{9}$';

update formateurs
set whatsapp = '+229' || '0' || substring(regexp_replace(whatsapp, '\D', '', 'g') from 4)
where whatsapp is not null
  and regexp_replace(whatsapp, '\D', '', 'g') ~ '^229\d{9}$';
