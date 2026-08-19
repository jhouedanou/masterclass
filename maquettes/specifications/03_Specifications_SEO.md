# Spécifications SEO développeur — E-Masterclass Big Five

## Objectif

Permettre à l’équipe de gérer le référencement des pages publiques depuis le back-office, sans intervention du développeur à chaque mise à jour, tout en automatisant les règles techniques communes.

## 1. Pages indexables

- accueil ;
- programmes Social Média et Entrepreneurs ;
- fiches modules publiées ;
- page Formateurs ;
- fiches formateurs suffisamment complètes ;
- Devenir formateur lorsque les candidatures sont ouvertes ;
- Contact et FAQ ;
- blog et articles publiés.

Les thématiques ne possèdent pas de pages autonomes. Elles restent des sections des pages programmes.

## 2. Pages non indexables

Appliquer `noindex` et ne pas inclure dans le sitemap :

- authentification et réinitialisation de mot de passe ;
- tunnel d’achat, paiement et confirmation ;
- dashboard apprenant ;
- dashboard administrateur ;
- profil et fiche apprenant ;
- coaching, certificats et contenus privés ;
- résultats de recherche et combinaisons de filtres ;
- brouillons, prévisualisations et pages techniques.

## 3. Onglet back-office « Référencement et partage »

À intégrer sur l’accueil, les programmes, les modules, les formateurs, les pages éditoriales et les articles.

### Champs éditables par les administrateurs de contenu

- mot-clé principal, repère interne non transmis comme `meta keywords` ;
- Title Google ;
- Meta description ;
- aperçu du résultat Google ;
- titre Open Graph ;
- description Open Graph ;
- image Open Graph ;
- texte alternatif pour chaque image éditoriale.

### Champs réservés aux administrateurs supérieurs

- slug / URL ;
- indexation autorisée ou refusée ;
- canonical personnalisée, uniquement pour un cas exceptionnel.

### Validation des champs

- avertir lorsqu’un Title ou une Meta description duplique une autre page ;
- afficher un aperçu sans bloquer arbitrairement sur un nombre fixe de caractères ;
- exiger un Title et une Meta description pour les pages prioritaires avant publication ;
- conserver un historique de modification du slug ;
- demander confirmation avant toute modification d’une URL déjà publiée.

## 4. Valeurs automatiques

Lorsqu’un champ n’est pas personnalisé :

- Title module : `[Titre du module] | E-Masterclass Big Five` ;
- URL : slug généré depuis le titre ;
- Meta description : générée depuis le résumé éditorial, puis modifiable ;
- Open Graph : reprend le Title, la Meta description et l’image principale ;
- canonical : URL publique finale de la page.

Ne jamais générer une chaîne de mots-clés comme Meta description.

## 5. Publication et statuts

### Brouillon

- non accessible publiquement ;
- non indexable ;
- absent du sitemap.

### Publié et disponible

- indexable si l’option est activée ;
- présent dans le sitemap ;
- canonical automatique.

### Fiche commerciale « À venir »

- peut être publiée indépendamment du module pédagogique ;
- indexation désactivée par défaut ;
- activation possible par un administrateur supérieur si la page possède un titre, une description, un public, une promesse et des informations suffisantes ;
- un simple placeholder ne doit pas être indexé.

### Changement de slug

- créer automatiquement une redirection permanente de l’ancienne URL vers la nouvelle ;
- mettre à jour le sitemap, la canonical et les liens internes.

## 6. HTML et rendu

- un seul H1 par page ;
- hiérarchie logique H1, H2, H3 ;
- navigation, titres, paragraphes et liens en HTML sémantique ;
- contenu essentiel présent dans le DOM dès le chargement ;
- privilégier le rendu serveur, statique ou hydraté ;
- ne pas placer un contenu indexable uniquement dans un canvas, une image ou une propriété CSS `content` ;
- chaque page publique doit répondre avec un statut HTTP correct.

### Carrousel du hero

- conserver un seul élément H1 ;
- première partie fixe : « Montez en compétences. » ;
- seconde partie mise à jour selon le slide ;
- sous-titre, description, CTA, couleur et visuel changent ensemble ;
- rendre le contenu accessible au clavier et aux technologies d’assistance ;
- pause au survol et contrôle manuel ;
- glissement tactile sur mobile.

## 7. URLs et navigation

Structure recommandée :

- `/`
- `/programmes/social-media`
- `/programmes/entrepreneurs`
- `/modules/[slug]`
- `/formateurs`
- `/formateurs/[slug]`
- `/devenir-formateur`
- `/contact`
- `/blog`
- `/blog/[slug]`

Ajouter un fil d’Ariane visible et structuré sur les modules, les profils et les articles.

## 8. Sitemap et robots

- sitemap XML généré automatiquement ;
- mise à jour à chaque publication, dépublication ou changement d’URL ;
- inclure uniquement les URL canoniques indexables ;
- ne pas utiliser `robots.txt` comme substitut à `noindex` pour les pages privées ;
- déclarer le sitemap dans `robots.txt` ;
- soumettre le sitemap dans Google Search Console.

## 9. Données structurées

Générer en JSON-LD à partir des données déjà présentes :

- `Organization` pour E-Masterclass Big Five / BigFiveAbidjan SARL ;
- `BreadcrumbList` pour la navigation hiérarchique ;
- `Course` et `ItemList` pour les modules et les listes, sans promettre l’affichage d’un résultat enrichi en français ;
- `ProfilePage` / `Person` pour les formateurs complets ;
- `Article` pour le blog.

Les données structurées doivent correspondre exactement au contenu visible. Les tester avec Rich Results Test et Schema Markup Validator.

## 10. Images et partage

- formats WebP ou AVIF lorsqu’ils sont compatibles ;
- tailles responsives ;
- compression et chargement différé sous la ligne de flottaison ;
- dimensions explicites pour éviter les décalages de mise en page ;
- texte alternatif éditable ;
- balises Open Graph pour WhatsApp, Facebook et LinkedIn ;
- image sociale par défaut au niveau global, surchargeable par page.

## 11. Mobile, performance et PWA

- contenu et métadonnées identiques entre desktop, mobile et PWA ;
- aucune version mobile séparée sur une autre URL ;
- navigation et CTA accessibles au clavier ;
- Core Web Vitals suivis ;
- police et images optimisées ;
- service worker sans mise en cache durable de métadonnées périmées ;
- pages publiques accessibles sans installation de la PWA.

## 12. Mesure et contrôle

- connecter Google Search Console ;
- connecter GA4 avec consentement approprié ;
- suivre les vues des pages programmes et modules, clics CTA, débuts d’achat et achats confirmés ;
- contrôler les erreurs 404, redirections, pages exclues et données structurées ;
- tester les URL clés avec l’outil d’inspection de Search Console après mise en ligne.

## 13. Permissions

- administrateur de contenu : textes visibles, Titles, Meta descriptions, partage, images et alt ;
- administrateur supérieur : transactions, slugs publiés, indexation, canonicals et règles globales ;
- formateurs : aucun dashboard complet nécessaire ; leurs données publiques sont administrées par l’équipe.

## 14. Points explicitement hors du back-office SEO

- aucune balise `meta keywords` ;
- aucun champ SEO pour chaque paragraphe ou chaque bloc visuel ;
- le H1 et les textes visibles restent gérés dans les contenus de page ;
- sitemap, canonical, redirections, données structurées et robots restent automatiques.

## 15. Références techniques officielles

- Google Search Central — SEO pour développeurs : https://developers.google.com/search/docs/fundamentals/get-started-developers
- JavaScript SEO : https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- Meta descriptions : https://developers.google.com/search/docs/appearance/snippet
- Breadcrumbs : https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
- Données structurées Course : https://developers.google.com/search/docs/appearance/structured-data/course
