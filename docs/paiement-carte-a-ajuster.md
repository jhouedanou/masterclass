# Paiement par carte (Visa, Djamo) : ce qui reste à ajuster

Constat du 15/10/2026. Le paiement par carte est **désactivé** sur la plateforme
(`FEEXPAY_CARTE_ACTIVE=false`) : Visa et Djamo n'apparaissent plus dans le tunnel,
sur la fiche module ni dans la FAQ, et le serveur refuse une commande passée avec
l'un de ces deux moyens.

## 1. Faire valider le KYC carte chez FeexPay (bloquant, côté Big Five)

Réponse de l'API FeexPay à une demande de paiement par carte sur la boutique
« Big Five Abidjan » :

```
403 CARD_PAYMENT_NOT_AUTHORIZED
"Card payment is not authorized for this merchant"
"Card payments require a fully validated card KYC."
card_kyc_status: "draft"
```

Le dossier de conformité carte est resté à l'état de brouillon. À compléter et
soumettre depuis le tableau de bord FeexPay, puis attendre sa validation.

**Vérifier l'activation** : refaire une demande `POST /api/transactions/public/requesttopay/init`
(clé d'API live, montant de 100 F CFA). Tant que la réponse est `CARD_PAYMENT_NOT_AUTHORIZED`,
rien n'a changé. Une réponse portant une `payment_url` signifie que la carte est
ouverte : ne pas aller au bout de la page, aucune somme n'est prélevée tant que la
carte n'est pas saisie.

## 2. Rattacher la transaction carte à notre commande (bloquant, côté code)

C'est le point le plus important. Le parcours carte du SDK FeexPay
(`processCardPayment`) envoie à FeexPay le nom, l'e-mail, le téléphone et
l'adresse, mais **ni `custom_id` ni `callback_info`**. Or notre vérification
(`rapprocherCommande`, `server/utils/feexpay.ts`) exige que la transaction porte
la référence de la commande (`FP-…`) et la rejette sinon (409).

Conséquence probable : une carte débitée ne serait jamais rapprochée de sa
commande, ni au retour du client ni par le webhook. L'apprenant paierait sans que
son module s'ouvre.

À faire, une fois le KYC validé :

1. Payer une vraie commande par carte, puis lire la transaction avec
   `GET /api/transactions/public/single/status/{reference}`. Vérifier si `custom_id`
   y figure.
2. S'il manque, ouvrir le paiement carte depuis notre serveur plutôt que par le
   SDK : appeler `requesttopay/init` dans `POST /api/commandes` avec `custom_id`,
   `callback_info`, `callback_url` et les coordonnées du compte, puis rediriger le
   navigateur vers la `payment_url` renvoyée. L'API accepte ces champs sans erreur
   de validation (testé), mais seul un paiement réel dira si elle les conserve.
3. Si FeexPay ne conserve `custom_id` sur aucune route, conserver la référence
   FeexPay renvoyée par `requesttopay/init` sur la commande (nouvelle colonne) et
   rapprocher par elle.

## 3. Retour depuis la page de paiement FeexPay (fait, à confirmer en réel)

La carte ne se règle pas dans la fenêtre : le client est envoyé sur une page
hébergée par FeexPay, et le rappel JavaScript du SDK n'est jamais appelé. Le
tunnel transmet désormais `callback_url` et `error_callback_url` :

- succès : `/achat/paiement?retour=<commande>`
- échec : `/achat/paiement?retour=<commande>&issue=echec`

Au retour, la page relance la vérification serveur. L'achat en cours (module ou
séance, moyen) est mis de côté dans le `sessionStorage` de l'onglet avant le
départ, pour que l'écran de succès mène au bon module et que « Réessayer »
fonctionne.

À confirmer sur un vrai paiement :

- les paramètres que FeexPay ajoute à l'URL de retour. Le code lit `reference`,
  `transaction_id`, `transactionId` et `ref`, et sinon recherche la transaction par
  commande dans l'historique ;
- que FeexPay ramène bien le client sur `error_callback_url` en cas de refus ou
  d'abandon ;
- le cas « Paiement non abouti » au retour d'échec : le motif affiché est « Carte
  refusée », faute de mieux.

## 4. Réactiver

Une fois les points 1 et 2 réglés :

1. Mettre `FEEXPAY_CARTE_ACTIVE=true` dans les variables d'environnement Vercel
   (Production, et Preview si la recette s'y fait).
2. Redéployer : la valeur est lue au moment du build.
3. Tester un paiement Visa et un paiement par carte Djamo de bout en bout :
   débit, retour sur la plateforme, module ouvert, transaction visible dans
   l'administration.

## 5. Questions à poser à FeexPay

- Djamo : le SDK ne propose aucun portefeuille Djamo (seulement Coris et Wave).
  Un client Djamo doit-il passer par sa carte Visa, ou existe-t-il un autre
  parcours ?
- Les frais carte : l'API annonce 1,7 % (`/api/transactions/details`), mais la
  fenêtre indique qu'ils dépendent de la zone d'émission de la carte. Quel est le
  barème réel, et qui le paie ?
- Le webhook est-il appelé pour les paiements par carte, et avec quel contenu ?
