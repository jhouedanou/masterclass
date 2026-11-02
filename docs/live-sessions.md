# Live Sessions : mise en production

Cette note accompagne le CDC v1.3 et les planches 01 à 08 de la maquette. Les règles métier sont dans le code ; ici, seulement ce qu'il faut faire pour mettre la fonctionnalité en ligne.

## 1. Base de données

Il y a trois migrations, à appliquer dans l'ordre : `npm run db:sql` génère les fichiers, ou bien `npm run db:appliquer -- <fichier>`. Les copies se trouvent aussi dans `.migrations-a-appliquer/`.

| Fichier | Contenu |
| --- | --- |
| `20261030120000_live_sessions_enums.sql` | Statut de module `live-session`, section admin `live-sessions`, statuts de session et d'inscription, visibilité |
| `20261030120100_live_sessions.sql` | Tables `sessions_live`, `inscriptions_live` et `reglages_live`, `commandes.session_live_id`, `acces.inscription_live_id`, fonctions `reserver_place_live`, `confirmer_inscription_live` et `live_terminee_pour`, seau privé `supports-live` |
| `20261030120200_quiz_apres_live.sql` | Quiz et certificat ouverts aux inscrits d'une session terminée |

`npm run db:verifier` rejoue tout sur PGlite et contrôle la capacité, l'idempotence du webhook, l'unicité de la session active et les autres règles.

## 2. Cycle toutes les 5 minutes

L'offre Vercel Hobby limite les crons à un par jour. C'est donc Supabase qui appelle `/api/taches/live-sessions` toutes les 5 minutes : voir `supabase/planification-live.sql`, à exécuter une fois dans SQL Editor après avoir rangé `TACHES_CLE` dans Vault.

Le cycle fait trois choses :

- il expire les réservations ;
- il passe les sessions de publiée à en cours, puis de en cours à terminée ;
- il envoie les rappels J-1, H-10 et H0, le rappel J-1 au formateur et l'e-mail de fin.

Chaque envoi est horodaté et ne part qu'une fois.

## 3. Variables d'environnement

Rien n'est obligatoire en plus de l'existant : FeexPay, Zoom (Server-to-Server OAuth et Meeting SDK), Resend et `TACHES_CLE`. Trois variables sont facultatives (10.B) :

- `TIKTOK_EVENTS_JETON` : l'Events API de TikTok, avec le pixel saisi dans Tracking ;
- `LINKEDIN_CAPI_JETON` et `LINKEDIN_CONVERSION_ID` : la Conversions API de LinkedIn.

Sans elles, seule l'API Conversions de Meta reçoit les inscriptions.

## 4. Diffusion (option B)

La session se suit dans la salle intégrée (`/mon-espace/live/[id]`), avec le Meeting SDK, comme les coachings.

- **Liens Zoom.** Ils ne sortent jamais vers les inscrits : les e-mails renvoient à la salle de l'espace.
- **Formateur.** Il anime depuis `/formateur/live/[id]`, en rôle hôte, 30 minutes avant le début.
- **Modérateur.** Il entre depuis la fiche admin (« Modérer la session »).
- **Réunion.** Elle est créée à la publication, sauf si un ID est saisi. Réglages : sourdine à l'entrée, pas de salle d'attente, enregistrement cloud. Le mode réunion suppose une licence Pro avec Large Meetings ; le mode Webinar demanderait une inscription Zoom par participant pour le SDK.

## 5. Ouverture

1. Laisser **Live Sessions → Fonctionnalité** sur « Personne » tant que les migrations ne sont pas appliquées.
2. Passer à « Admins seulement » pour tester en production. Le menu, `/live-sessions` et les fiches sont alors visibles des admins. Les cartes du catalogue restent « À venir » : elles sont mises en cache pour tout le monde.
3. Passer à « Tout le monde » le jour J.

## 6. Points laissés à l'équipe

- **Textes CGV et confidentialité.** Les sections Live Session sont des brouillons, à remplacer par les textes validés.
- **Revenus formateur.** La transaction d'une inscription porte le module : elle compte comme une vente du module.
- **Quiz.** Il garde le plafond quotidien de tentatives des modules.
- **Brief de montage** (planche 07, post-production) : prévu en V2.
