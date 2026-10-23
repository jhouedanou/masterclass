# Conteneur GTM à importer — E-Masterclass Big Five

Fichier : `gtm-conteneur-e-masterclass.json` (conteneur `GTM-KVFTGVVX`).

Ce qu'il contient :

- **GA4 - Balise Google** : `G-7Y25B7NCW8`, déclenchée à l'initialisation de chaque page ;
- **GA4 - Événements du tunnel** : une balise d'événement GA4 qui reprend tel quel le nom poussé
  par le site (`view_item`, `sign_up`, `begin_checkout`, `add_payment_info`, `purchase`), avec les
  données e-commerce du `dataLayer` (articles, valeur en XOF, `transaction_id`, `payment_type`)
  et les paramètres `event_id` et `method` ;
- le déclencheur et les deux variables de couche de données qu'elle utilise.

Aucune balise Meta : le Pixel est chargé par le site lui-même, avec son API Conversions côté
serveur. En ajouter une dans GTM ferait compter chaque événement deux fois.

## Importer

1. Ouvrir tagmanager.google.com avec le compte analyticsbigfive@gmail.com, conteneur
   `GTM-KVFTGVVX`.
2. **Administration → Importer un conteneur**, choisir le fichier JSON.
3. Espace de travail : **Existant** (ou nouveau) ; option **Fusionner**, puis **Renommer les
   éléments en conflit**. « Écraser » remplacerait tout ce que le conteneur contient déjà.
4. Vérifier avec **Prévisualiser** (Tag Assistant) sur le site : accepter les cookies, ouvrir une
   fiche module (`view_item`), cliquer « Acheter ce module » (`begin_checkout`).
5. **Envoyer** pour publier.

Côté GA4 : dans le flux Web, garder la **mesure améliorée** active avec « Changements de page
basés sur les événements de l'historique du navigateur » : le site est une application monopage,
c'est ce qui compte les pages vues après la première.

Le site ne charge GTM qu'après le consentement « Mesure d'audience » et transmet l'état du
consentement (mode Consentement v2) avant le conteneur : les balises GA4 s'y conforment d'elles-mêmes.
