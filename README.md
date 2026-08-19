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
| Styles | Tailwind CSS 4 (`@tailwindcss/vite`), jetons dans `app/assets/css/main.css` |
| Typographies | Jost 300/400/500/600 (titres) et Mulish 400/600/700/800 (textes) via `@nuxt/fonts`, auto-hébergées |
| État | Pinia |
| SEO | `@nuxtjs/robots`, `@nuxtjs/sitemap`, `nuxt-schema-org` |
| Images | `@nuxt/image` · Icônes | `@nuxt/icon` + `@iconify-json/ph` |
| QR code | `qrcode` (généré côté serveur) |

## Démarrage

```bash
npm install
npm run dev
```

Build et aperçu de production :

```bash
npm run build && node .output/server/index.mjs
```

Copier `.env.example` en `.env` et renseigner `NUXT_PUBLIC_SITE_URL` : cette valeur alimente les
canonical, le sitemap et le lien de vérification des certificats.

### Comptes de démonstration

| Rôle | E-mail |
|---|---|
| Apprenante | `aya@example.ci` |
| Formateur | `formateur@bigfive.ci` |
| Administrateur de contenu | `editeur@bigfive.ci` |
| Administrateur supérieur | `admin@bigfive.ci` |

Le mot de passe n'est pas vérifié : l'authentification est un mock (voir « Reste à faire »).

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
/connexion  /inscription  /mot-de-passe-oublie
/achat/compte  /achat/recapitulatif  /achat/paiement      tunnel 1. Compte · 2. Récapitulatif · 3. Paiement
/mon-espace                          tableau de bord apprenant
/mon-espace/modules  /mon-espace/module/[slug]  /mon-espace/sessions
/mon-espace/certificats  /mon-espace/profil
/certificats/[numero]                certificat imprimable (A4 paysage)
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
/admin/blog  /admin/referencement  /admin/historique  /admin/parametres
```

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

## Reste à faire

- **Authentification réelle** : la session est un cookie contenant l'identifiant utilisateur en
  clair, sans mot de passe vérifié (`server/utils/session.ts`). À remplacer avant toute mise en
  ligne.
- **Base de données** : les données vivent en mémoire dans `server/data/db.ts` et sont perdues à
  chaque redémarrage.
- **Paiement FeexPay** : `POST /api/commandes` simule la commande ; les états attente /
  vérification / succès / échec sont en place côté interface, le prestataire reste à brancher.
- **Envoi d'e-mails et WhatsApp transactionnel** : formulaires et réinitialisation de mot de passe
  journalisent seulement.
- **Lecteur vidéo** : l'écran, le watermark et le script synchronisé sont en place ; le flux HLS et
  les URL signées restent à brancher, de même que l'enregistrement du temps réel de visionnage.
- **Écrans admin restants** (planche C) : création/édition de module avec prévisualisation, CMS du
  site vitrine, onglets détaillés Funnel / Ventes / Visites / Clients, paramètres de tracking et
  administration fine des droits. Les écrans Vue d'ensemble, Contenus, Sessions, Apprenants,
  Coaching privé, Formateurs, Performances, Revenus, Transactions, Historique, Paramètres, Blog et
  Référencement sont en place.
- **Zoom Meeting SDK** : la salle de session est en place côté interface ; le jeton serveur, la
  sélection Component/Client View et le contrôle de compatibilité restent à brancher.
- **PWA, GA4 et Search Console** (spec §11–12).
- **Bandeau cookies** (planche A, écran 10).
