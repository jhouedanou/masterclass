# E-Masterclass Big Five

Plateforme de formation en ligne de **BigFiveAbidjan SARL** : programmes Social Média et
Entrepreneurs, 18 modules de 60 minutes à 10 000 FCFA TTC, coaching collectif et privé, blog,
back-office de référencement et certificats de participation.

L'interface reproduit la maquette Claude Design fournie (`maquettes/`), planches A à D.

## Stack

| Brique | Choix |
|---|---|
| Framework | Nuxt 4 (Vue 3.5, Vue Router 5) — full-stack, rendu serveur |
| API | Nitro (`server/api`) — même codebase |
| Base de données | Supabase (PostgreSQL) — migrations SQL versionnées dans `supabase/migrations` |
| Accès aux données | `@supabase/supabase-js` (clé secrète `sb_secret_…`, serveur uniquement), dépôts dans `server/database` |
| Styles | Tailwind CSS 4 (`@tailwindcss/vite`), jetons dans `app/assets/css/main.css` |
| Typographies | Jost 300/400/500/600 (titres) et Mulish 400/600/700/800 (textes) via `@nuxt/fonts`, auto-hébergées |
| État | Pinia |
| SEO | `@nuxtjs/robots`, `@nuxtjs/sitemap`, `nuxt-schema-org` |
| Images | `@nuxt/image` · Icônes | `@nuxt/icon` + `@iconify-json/ph` |
| QR code | `qrcode` (généré côté serveur) |
| PWA | `@vite-pwa/nuxt` — manifeste, service worker, installation |

## Démarrage

```bash
npm install
npm run dev
```

Build et aperçu de production :

```bash
npm run build && node .output/server/index.mjs
```

Créer un fichier `.env` à la racine (non versionné, comme tout fichier `.env*`) :

```bash
NUXT_PUBLIC_SITE_URL=https://emasterclass.bigfive.ci
SUPABASE_URL=            # console Supabase → Settings → API
SUPABASE_SECRET_KEY=         # Settings → API keys → Secret keys — jamais la clé publishable
```

`NUXT_PUBLIC_SITE_URL` alimente les canonical, le sitemap et le lien de vérification des
attestations. Sans les deux variables Supabase, chaque route d'API répond 500 avec un message
explicite.

### Comptes de démonstration

| Rôle | E-mail |
|---|---|
| Apprenante | `aya@example.ci` |
| Formateur | `formateur@bigfive.ci` |
| Administrateur de contenu | `editeur@bigfive.ci` |
| Administrateur supérieur | `admin@bigfive.ci` |

Mot de passe commun : **`Masterclass2026!`** — défini par le seed, à changer avant toute mise en
ligne publique.

## Authentification

Connexion par e-mail et mot de passe, selon la planche C (« Connexion sécurisée ») :

| Règle | Où |
|---|---|
| Mots de passe hachés en scrypt (sel par compte, comparaison à temps constant) | `server/utils/motDePasse.ts` |
| Session dans un cookie scellé — chiffré et signé, `Secure` dès que la requête est en HTTPS | `server/utils/session.ts` |
| Journal des tentatives : e-mail, IP, appareil, horodatage | table `connexions` |
| 5 échecs en 30 minutes → compte verrouillé 30 minutes + entrée au journal d'administration | `enregistrer_tentative_connexion()` |
| Réinitialisation par lien à usage unique, valable 30 minutes | table `reinitialisations_mot_de_passe` |
| Droits fins par section du back-office | `utilisateurs.sections_autorisees`, `exigerSection()` |

Le compte est relu en base à chaque requête : révoquer un droit ou supprimer un compte prend effet
immédiatement, sans attendre l'expiration de la session.

**Deux points restent ouverts**, faute de fournisseur d'envoi :

- la **double vérification** par code à six chiffres (e-mail + WhatsApp) prévue par la maquette :
  la table `codes_verification` est en place, l'étape n'est pas activée ;
- le **lien de réinitialisation** n'est pas envoyé par e-mail — il est journalisé côté serveur,
  à transmettre à la main en attendant.

## Base de données

Toutes les données vivent dans PostgreSQL, chez Supabase. Le schéma est décrit par des migrations
SQL versionnées, relues comme du code.

```
supabase/
  migrations/
    20260828120000_schema_initial.sql   24 tables, 13 types énumérés, contraintes et index
    20260828120100_fonctions_metier.sql déclencheurs et fonctions transactionnelles
    20260828120200_securite_rls.sql     RLS activé, clé « anon » privée de tout accès
  seed.sql                              contenu initial, généré depuis server/data/db.ts
  en-ligne/                             les mêmes fichiers, assemblés pour l'éditeur SQL
```

### Installer sur le projet Supabase hébergé

Sans rien installer, depuis **SQL Editor** du projet. Un fichier par migration, à exécuter dans
l'ordre des numéros :

```
01-schema-initial.sql      tables, types, contraintes, index
02-fonctions-metier.sql    déclencheurs et fonctions transactionnelles
03-securite-rls.sql        RLS activé, clé publique privée de tout accès
04-authentification.sql    mots de passe, journal des connexions, droits fins
99-donnees.sql             contenu initial — base neuve uniquement
```

Sur une base **déjà installée**, n'exécutez que les fichiers dont le numéro vous manque. Si elle a
été peuplée avant `04-authentification.sql`, ses comptes n'ont pas de mot de passe : exécuter
ensuite `rattrapage-mots-de-passe.sql`, qui les pourvoit sans jamais écraser un mot de passe
existant.

Puis relever `SUPABASE_URL` (*Settings*) et une clé secrète `sb_secret_…` (*Settings → API keys →
Secret keys* — l'ancienne clé `service_role` JWT reste acceptée via `SUPABASE_SERVICE_ROLE_KEY`),
et les reporter dans `.env`. Ces deux fichiers sont assemblés depuis les migrations : les régénérer avec `npm run db:sql`
après toute modification du schéma.

Avec la CLI, la voie recommandée reste `npm run db:migrer` (`supabase db push`), qui tient le
registre des migrations appliquées.

### En local

```bash
npm run db:demarrer   # supabase start (nécessite Docker)
npm run db:reset      # recrée la base, rejoue les migrations puis le seed
```

### Vérifier les migrations sans Docker

```bash
npm run db:verifier
```

Rejoue les migrations, le seed et les fichiers d'installation en ligne sur un PostgreSQL réel
compilé en WebAssembly (PGlite), puis contrôle les règles métier : réservation d'une place,
délivrance d'un certificat, attribution d'accès, contraintes et déclencheurs.

### Modifier le contenu

`server/data/db.ts` reste la source du contenu éditorial — 18 modules et leurs chapitres, fiches
formateurs, articles — tant qu'aucun back-office ne permet de le saisir. Après modification :

```bash
npm run db:seed:generer   # régénère supabase/seed.sql
npm run db:sql            # régénère supabase/en-ligne/
npm run video:verifier    # contrôle la chaîne vidéo (signature, flux transcodés)
```

Aucun endpoint n'importe ce fichier : l'application passe par les dépôts de `server/database`.

### Ce que la base garantit

Trois opérations qui étaient exposées à une course sont passées en fonction transactionnelle
(`supabase/migrations/…_fonctions_metier.sql`) :

| Fonction | Ce qu'elle règle |
|---|---|
| `reserver_place_session` | verrouille la session : deux réservations sur la dernière place ne peuvent plus passer toutes les deux |
| `delivrer_certificat` | numérote depuis une séquence, plus depuis la taille d'un tableau ; idempotente |
| `attribuer_acces` | ouvre l'accès et journalise l'action dans la même transaction |

La sécurité au niveau des lignes est activée sur toutes les tables, **sans aucune politique** :
l'application lit et écrit avec la clé secrète depuis Nitro, et la clé publique (publishable /
`anon`) n'a accès à rien. Les contrôles d'accès restent portés par `server/utils/session.ts`.

## Direction artistique

Jetons repris de la maquette, tous regroupés dans le bloc `@theme` de `app/assets/css/main.css` :

- violet `#80368D` — programme Social Média ;
- bleu `#29358B` — programme Entrepreneurs ;
- encre `#17151c`, texte `#4b4855`, discret `#6d6a75`, lignes `#dcd7e6` / `#e6e1ef`, fonds
  `#faf9fc` / `#f3f0f8` ;
- vert `#1fa855` pour WhatsApp, `#1a8747` pour les états de succès.

Les titres sont en Jost Light (300) et les H1 en Jost Medium (500), comme dans la maquette. Le logo
officiel et le motif proviennent de `maquettes/maquettes/assets/`.

## Arborescence des routes

**Public, indexable**

```
/                                  accueil (hero 2 slides, programmes, thématiques, formateurs, FAQ, blog)
/programmes/social-media           hero, filtres par thématique, FAQ programme
/programmes/entrepreneurs
/modules                           catalogue complet
/modules/[slug]                    fiche module + carte d'achat sticky
/formateurs                        profils dépliables + coaching privé
/formateurs/[slug]
/devenir-formateur                 formulaire de candidature
/contact                           contact + FAQ générale
/blog  /blog/[slug]
/sessions                          calendrier des coachings collectifs
/mentions-legales /cgu /cgv /confidentialite /cookies
```

**Privé, `noindex` + hors sitemap**

```
/connexion  /inscription  /mot-de-passe-oublie  /reinitialiser-mot-de-passe
/achat/compte  /achat/recapitulatif  /achat/paiement      tunnel 1. Compte · 2. Récapitulatif · 3. Paiement
/mon-espace                          tableau de bord apprenant
/mon-espace/modules  /mon-espace/module/[slug]  /mon-espace/sessions
/mon-espace/certificats  /mon-espace/profil
/certificats/[numero]                certificat imprimable (A4 paysage)
/verifier                            saisie manuelle d'un numéro d'attestation
/verifier/[numero]                   cible du QR code, accessible sans compte
/mon-espace/lecture/[slug]           lecteur vidéo, watermark nominatif, script synchronisé
/mon-espace/session/[id]             salle de coaching collectif (Zoom SDK à intégrer)
/formateur                           tableau de bord formateur
/formateur/modules  /formateur/sessions  /formateur/coaching-prive
/formateur/revenus  /formateur/profil
/admin                               vue d'ensemble
/admin/contenus                      arbre programme → thématique → module
/admin/sessions                      calendrier, création, report, annulation notifiée
/admin/apprenants                    liste, fiche persona, attribution d'accès
/admin/coaching-prive                demandes + statistiques par formateur
/admin/formateurs                    profils, ordre public, candidatures
/admin/performances  /admin/revenus  /admin/transactions (droit restreint)
/admin/module/[id]                   éditeur : informations, chapitres, ressources, offre, historique
/admin/cms                           CMS du site vitrine et témoignages
/admin/tracking                      tracking & pixels (écran verrouillé)
/admin/acces                         comptes d'administration et droits par section
/admin/blog  /admin/referencement  /admin/historique  /admin/parametres
```

## Back-office

Les écrans de la planche C sont tous en place. Deux mécanismes les traversent :

**Droits par section.** Un compte d'administration reçoit ses sections une à une (17 au total).
Une section non cochée est **masquée**, pas seulement désactivée : la navigation ne l'affiche pas et
l'API répond 403. `exigerSection()` (`server/utils/session.ts`) porte la règle côté serveur,
`auth.voitSection()` côté navigation. Deux droits — Transactions et Référencement avancé — ne
peuvent être accordés que par un administrateur supérieur, sans quoi un compte de contenu
s'octroierait ce qu'on lui a refusé.

**Historique et restauration.** Toute écriture sur un module, un article ou un bloc du site
enregistre d'abord l'état précédent dans `versions_contenu`. Restaurer réécrit l'objet avec ce JSON,
et la restauration est elle-même journalisée.

Trois garde-fous méritent d'être connus :

| Écran | Règle |
|---|---|
| Éditeur de module | l'offre ne s'ouvre pas sans promesse, « pourquoi » et au moins un chapitre |
| Tracking & pixels | verrouillé par défaut ; déverrouiller exige de ressaisir son mot de passe, et chaque changement part au journal avec son ancienne valeur (jamais les secrets) |
| Administration des accès | un compte ne peut pas se révoquer lui-même — cela laisserait la plateforme sans personne pour rouvrir les droits |

## Consentement et PWA

Le **bandeau cookies** (planche A, écran 10) propose trois catégories : essentiels (toujours actifs),
mesure d'audience, marketing. Le choix vit dans le stockage local, se redemande au bout d'un an, et
se retire depuis « Gérer mes cookies » au pied de page. Rien n'est chargé tant que le visiteur n'a
pas tranché.

La plateforme s'installe comme **application** : manifeste, icônes dérivées du logo (dont une
version *maskable*), et service worker qui met en cache les images, polices et styles.
Tout ce qui touche aux comptes, aux paiements et au back-office est exclu du cache.

## Conformité à la spec SEO

| Point de la spec | Où c'est implémenté |
|---|---|
| §1–2 pages indexables / non indexables | `nuxt.config.ts` (robots, sitemap) + `usePagePrivee()` par page |
| §3 onglet back-office | `app/pages/admin/referencement.vue`, `server/api/admin/referencement.*` |
| §3 doublons Title / description | `detecterDoublons()` dans `server/utils/seo.ts` + alerte en direct |
| §3 champs réservés (slug, indexation, canonical) | filtrés côté serveur selon le rôle, désactivés côté UI |
| §3 confirmation avant changement d'URL | `confirmationSlug` exigé par l'API (HTTP 428 sinon) |
| §4 valeurs automatiques | `usePageSeo()` et `resoudreSeo()` — jamais de meta keywords |
| §5 statuts brouillon / disponible / en préparation | champ `statut`, exclusion du sitemap et des listes publiques |
| §5 redirection 301 sur changement de slug | `server/middleware/redirections.ts` |
| §6 un seul H1, carrousel accessible | `app/components/home/HeroCarousel.vue` (pause, clavier, tactile) |
| §7 URLs et fil d'Ariane | routes ci-dessus + `FilAriane.vue` / `useFilAriane()` |
| §8 sitemap et robots | `server/api/__sitemap__/urls.get.ts` |
| §9 données structurées | `nuxt-schema-org` (Organization) + `useJsonLd()` : Course, Person, Article, BreadcrumbList, FAQPage, ItemList |
| §10 images et partage | `@nuxt/image`, alt éditable, Open Graph par page |
| §11 mobile, identité desktop/mobile | rendu serveur unique, pas d'URL mobile séparée |
| §13 permissions | `exigerAdmin(event, superieur)`, `exigerFormateur(event)` dans `server/utils/session.ts` |

Vérifié sur le build de production : un seul `<h1>` par page, canonical présent, `noindex` sur les
pages privées, sitemap limité aux URL publiées (le module « en préparation » et le brouillon de blog
en sont absents). `Disallow: /formateur/` et `/formateur$` sont utilisés pour ne pas bloquer
`/formateurs`.

## Certificat de participation

Libellé d'interface repris de la maquette (« Mes certificats ») ; le corps du document reprend le
squelette « Attestation de suivi de module » fourni par le client.

- Numérotation : `EMBF-<CODE PROGRAMME>-<ANNÉE>-<SÉQUENCE>` (ex. `EMBF-ENT-2026-000128`).
- Délivrance déclenchée à 100 % de progression (`POST /api/certificats`).
- QR code produit côté serveur, pointant vers `/verifier/<numero>`.
- Export PDF via l'impression du navigateur (feuille `@media print`, A4 paysage).

## Règles métier appliquées

- **Coaching collectif** : une session par couple thématique–formateur, 2 h, 25 places. Elle
  n'apparaît que chez les apprenants possédant un module de la thématique. La réservation exige
  une fiche apprenant complète **et** la soumission de deux réponses obligatoires, transmises au
  formateur avant la séance (`POST /api/mon-espace/sessions/reserver`).
- **Notation** : proposée après chaque séance, visible de l'administration et du formateur, jamais
  publiée sur le site. La note moyenne du tableau de bord formateur est calculée sur ces entrées.
- **Annulation de session** : les inscrits sont comptés et notifiés (e-mail + WhatsApp), l'action
  est journalisée.
- **Attribution d'accès** : motif obligatoire, marquée « Attribution admin » et distincte d'un
  achat, apprenant notifié, action journalisée.
- **Transactions** et **paramètres financiers** : réservés à l'administrateur supérieur ; l'API
  répond 403 aux autres, l'écran affiche le bloc verrouillé.
- **Lecteur** : watermark nominatif affiché en permanence, script cliquable par timecode, et
  mention explicite que l'avance rapide ne validera pas la progression.

## Modèle économique implémenté

- Module : 10 000 FCFA TTC, accès à vie, coaching collectif de la thématique inclus.
- Coaching collectif : 2 heures, 25 places, une session par thématique.
- Coaching privé : 50 000 FCFA / heure, réservé et payé séparément.
- Revenus formateur : CA − 4 % de frais FeexPay = marge brute ; 30 % formateur, 70 % Big Five
  (`server/utils/formateur.ts`).

## WhatsApp

Numéro officiel centralisé dans `shared/utils/contact.ts` :

- affichage `+225 05 75 15 21 44` ;
- lien `https://wa.me/2250575152144` (zéro initial conservé, conforme au plan de numérotation
  ivoirien depuis 2021 — résolution vérifiée).

Utilisé par le bouton flottant, le pied de page, l'accueil, la FAQ, les fiches modules, les fiches
formateurs et le partage d'articles.

## Écarts assumés avec la maquette

1. **Titres de modules** — la maquette n'expose que 10 des 18 titres. Les 8 restants
   (Social Média 08–09, Entrepreneurs 04, 06, 08–09 notamment) ont été rédigés dans le même
   registre et doivent être remplacés par les titres du cahier des charges.
2. **Répartition formateurs** — la maquette annonce Jérémie De Clercq 4 modules, Coury Othniel 3 et
   Lyle Soboro 4, mais n'attribue nommément que 10 modules. La répartition retenue est cohérente
   avec les spécialités affichées ; à valider.
3. **Visuels** — les images de la maquette sont des placeholders rayés. Les SVG de `public/images`
   reprennent ce motif et attendent les visuels définitifs.
4. **Textes des modules** — seuls les modules « Accroches qui stoppent le scroll & IA copywriting »
   et « Fixer le juste prix de ses produits et services » ont un contenu validé par le client ; les
   autres suivent le même gabarit.
5. **Responsive** — les planches desktop, tablette et mobile de la maquette sont traitées comme des
   points de rupture d'une seule implémentation, pas comme trois interfaces distinctes.

## Vidéo

Trois pièces, aucun abonnement :

| Pièce | Rôle | Coût |
| --- | --- | --- |
| `ffmpeg`, sur un poste de travail | découpe une vidéo en flux HLS à plusieurs débits | nul |
| Cloudflare R2 | stocke les fichiers produits | gratuit sous 10 Go, sortie de données gratuite |
| Un Worker Cloudflare (`infra/worker-video`) | vérifie l'autorisation et sert les fichiers | gratuit sous 100 000 requêtes par jour |

L'application ne diffuse aucune vidéo. Elle vérifie l'accès une fois, puis remet à l'apprenant une
URL signée valable quatre heures et nominative. Le Worker recalcule la signature et sert le
fichier ; aucun segment ne traverse le serveur Nuxt, d'où le coût.

En développement, le Worker n'est pas nécessaire : la route `/medias` applique exactement la même
règle de signature sur les fichiers locaux. `npm run video:verifier` compare les deux
implémentations et échoue si elles divergent — une divergence rendrait toutes les vidéos illisibles
en production alors que tout fonctionnerait en local.

```bash
npm run video:transcoder -- medias/sources/chapitre.mp4 mod-monslug-ch01
npm run video:publier -- mod-monslug-ch01
```

Le transcodage imprime la clé et la durée mesurée, à reporter dans `server/data/db.ts` (contenu de
référence) ou directement en base. Un chapitre sans clé affiche l'écran d'attente du lecteur.

Mise en service du Worker : voir `infra/worker-video/README.md`.

Le filigrane nominatif reste indispensable : la signature empêche le partage d'un lien, pas
l'enregistrement d'écran. Elle rend une rediffusion attribuable.

## Reste à faire

- **Double vérification à la connexion** : la maquette prévoit un code à six chiffres envoyé par
  e-mail et WhatsApp (planche C). La table `codes_verification` est posée ; l'envoi attend un
  fournisseur. En attendant, la connexion s'arrête à l'étape mot de passe.
- **Paiement FeexPay** : `POST /api/commandes` enregistre la commande et son détail, prix figé à
  l'achat, mais ne réclame rien : les états attente / vérification / succès / échec sont en place
  côté interface, le prestataire reste à brancher.
- **Envoi d'e-mails et WhatsApp transactionnel** : formulaires et réinitialisation de mot de passe
  journalisent seulement.
- **Onglets détaillés de Performances** (Funnel / Ventes / Visites / Clients) : ils dépendent des
  mesures d'audience, donc du branchement de Google Tag Manager. Tous les autres écrans de la
  planche C sont en place.
- **Zoom Meeting SDK** : la salle de session est en place côté interface ; le jeton serveur, la
  sélection Component/Client View et le contrôle de compatibilité restent à brancher.
- **Mesures d'audience** : visites, visiteurs uniques, taux de conversion, appareils, sources et
  page la plus vue n'ont aucune source en base — leur collecte passe par Google Tag Manager. L'écran
  Performances affiche « — » à leur place plutôt qu'une estimation ; tout le reste (ventes, CA,
  acheteurs, complétion, certificats) est calculé sur les données réelles.
- **Présence en session** : `sessions_coaching.presents` attend d'être relevé après chaque séance.
  Tant qu'il est vide, les taux de présence s'effacent côté formateur et administration.
- **GA4 et Search Console** (spec §11–12) : l'écran Tracking attend les identifiants.
