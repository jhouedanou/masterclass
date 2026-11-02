# Conteneur GTM à importer — E-Masterclass Big Five

Fichier : `gtm-conteneur-e-masterclass.json` (conteneur `GTM-KVFTGVVX`).

## Ce qu'il contient

- **GA4 - Balise Google** : `G-7Y25B7NCW8`, déclenchée à l'initialisation, **sans page vue
  automatique** (`send_page_view = false`).
- **GA4 - Page vue** : l'événement `page_view` que le site pousse à chaque page publique, avec
  `page_location` et `page_title`. Le site n'en pousse aucune sur l'espace apprenant, le
  back-office, l'espace formateur ou les pages de connexion.
- **GA4 - Événements du tunnel** : une balise d'événement GA4 qui reprend tel quel le nom poussé
  par le site :
  - événements : `view_item`, `sign_up`, `begin_checkout`, `add_payment_info`, `purchase` ;
  - données e-commerce du `dataLayer` : articles, valeur en XOF, `transaction_id`, `payment_type` ;
  - paramètres : `event_id`, `method`, `content_category` (`module`, `coaching_prive` ou
    `live_session`).

  Le site n'envoie pas `view_item` sur la fiche d'un module que l'apprenant a déjà acheté.
- **GA4 - Pédagogie** : l'usage des modules, sur l'espace apprenant :

  | Événement | Quand | Paramètres |
  |---|---|---|
  | `module_open` | ouverture d'un module (fiche ou lecture), une fois par visite | `module_id`, `module_name` |
  | `video_start` | première lecture d'un chapitre | + `chapter_index`, `chapter_name` |
  | `video_progress` | paliers 25, 50, 75 et 90 % d'un chapitre | + `video_percent` |
  | `quiz_complete` | quiz soumis et corrigé | + `quiz_score` (sur 100), `quiz_passed` |
  | `module_complete` | toutes les vidéos vues pendant la séance | `module_id`, `module_name` |

  `page_location` est envoyé sans paramètres d'URL.
- Les déclencheurs et les variables de couche de données qu'utilisent ces balises.

**Aucune balise Meta.** Le Pixel est chargé par le site lui-même, seulement après le
consentement « Marketing », et l'API Conversions part du serveur sous la même condition. En
ajouter une dans GTM ferait compter chaque événement deux fois et contournerait ce consentement.
Les événements pédagogiques ne partent jamais vers Meta.

**Consentement.** Le site ne charge GTM qu'après le consentement « Mesure d'audience ». Il
transmet l'état du consentement (mode Consentement v2, `analytics_storage`, `ad_storage`,
`ad_user_data`, `ad_personalization`) avant le conteneur : les balises GA4 s'y conforment
d'elles-mêmes. Les balises restent donc en « Consentement non défini ». C'est voulu, n'ajoutez pas
de déclencheur de consentement.

## Importer et publier

1. Ouvrir tagmanager.google.com avec le compte analyticsbigfive@gmail.com, conteneur
   `GTM-KVFTGVVX`.
2. **Administration → Importer un conteneur**, choisir le fichier JSON.
3. Espace de travail : **Existant** (ou nouveau). Choisir l'option **Fusionner**, puis
   **Écraser les balises, déclencheurs et variables en conflit**, pour que la balise Google reçoive
   `send_page_view = false`. Attention, l'option « Écraser » (au lieu de « Fusionner »)
   remplacerait tout le conteneur.
4. Vérifier qu'il ne reste **qu'une seule** balise Google `G-7Y25B7NCW8` et aucune balise Meta.
5. GA4, flux Web (**Administration → Flux de données → Mesure améliorée → ⚙**) : **décocher
   « Changements de page basés sur les événements de l'historique du navigateur »**. C'est le
   site qui pousse chaque page vue. Laissée cochée, cette option ferait compter deux fois les pages
   publiques, et aussi `/mon-espace` ou `/admin`.
6. GA4, **Administration → Définitions personnalisées** : créer les dimensions d'événement
   `module_name`, `chapter_name`, `content_category`, `quiz_passed`, puis les métriques
   `video_percent` et `quiz_score`. Sans elles, ces paramètres n'apparaissent pas dans les rapports.

## Tester (avant « Envoyer »)

**GTM, mode Preview (Tag Assistant)**, sur le site :

1. Bandeau : **tout refuser**. Aucun appel à `googletagmanager.com` ni à `facebook.net`.
2. Bandeau : **Mesure d'audience** seule. Les balises GA4 se déclenchent, et il n'y a toujours
   aucun appel à `facebook.net`.
3. Pages publiques : un `page_view` par page, y compris après une navigation sans rechargement.
4. Fiche d'un module **non acheté** : `view_item`. Fiche d'un module **déjà acheté**, avec un
   compte connecté : pas de `view_item`.
5. « Acheter ce module » : `begin_checkout`. Paiement : `add_payment_info` puis `purchase`, avec
   `content_category = module`. Coaching privé payé : `content_category = coaching_prive`.
6. Espace apprenant :
   - à l'ouverture d'un module, `module_open` ;
   - à la lecture d'une vidéo, `video_start`, puis `video_progress` aux paliers ;
   - après le quiz, `quiz_complete` ;
   - aucun `page_view` sur l'espace apprenant.
7. Dans GA4, les événements apparaissent sous **Rapports → Temps réel** (ou DebugView).
8. **Envoyer** pour publier.

**Meta, outil de test des événements** (Gestionnaire d'événements → Tester les événements) :

1. Côté navigateur : saisir l'adresse du site dans l'outil, puis accepter **Marketing** dans le
   bandeau. On doit voir `PageView`, `ViewContent` (module non acheté seulement),
   `InitiateCheckout`, `AddPaymentInfo` et `Purchase`, avec `content_category`.
2. Côté serveur (API Conversions) : poser `META_CAPI_TEST_CODE=TEST88439` sur l'environnement
   **Preview** de Vercel, ou en local, jamais en Production (le site l'y ignore). Les événements
   serveur `CompleteRegistration` et `Purchase` apparaissent avec la mention « Serveur »,
   dédoublonnés avec ceux du navigateur grâce au même identifiant d'événement. Le `Purchase`
   serveur n'est pas envoyé en mode de paiement « simulation ».
3. Refaire un parcours en refusant Marketing : rien ne doit apparaître dans l'outil.
4. Après la recette, vider `META_CAPI_TEST_CODE` partout.
