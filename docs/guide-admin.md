# Guide de l'administration — E-Masterclass Big Five

Ce guide s'adresse à l'équipe qui gère la plateforme depuis le back-office. Il décrit la
connexion, puis les écrans dans l'ordre où l'équipe s'en sert, et dit ce qui est automatique, ce
qui est journalisé et ce qui reste à faire à la main.

Adresse du back-office : `/admin/login` (en production :
`https://masterclass-jhouedanous-projects.vercel.app/admin/login`).

Les identifiants des administrateurs ne figurent pas ici : ils sont remis à chacun séparément,
avec un mot de passe provisoire à changer dès la première connexion. Le guide remis avec ces
accès vit dans `docs/acces/`, exclu du dépôt.

État de la plateforme décrit : 23 octobre 2026.

---

## 1. Se connecter

La connexion se fait en deux étapes : le mot de passe, puis un code à six chiffres donné par une
application d'authentification (Google Authenticator, Authy, ou le gestionnaire de mots de passe
du téléphone). **Aucun code n'est envoyé par e-mail ou SMS.**

### Première connexion

1. Installer Google Authenticator (ou équivalent) sur son téléphone.
2. Ouvrir `/admin/login`, saisir l'identifiant et le mot de passe provisoire. La page
   « Connexion » du site renvoie les administrateurs vers `/admin/login`.
3. Scanner le QR code affiché. Une clé à saisir à la main est proposée pour les téléphones qui ne
   scannent pas.
4. Saisir le code à six chiffres de l'application, puis « Activer ». Rien n'est enregistré avant
   ce premier code correct : un QR code mal scanné ne condamne pas le compte.
5. Noter les **8 codes de secours** (format `XXXXX-XXXXX`), affichés une seule fois. Chacun sert
   une fois, en l'absence du téléphone. Il n'existe pas d'écran pour les régénérer.
6. Changer le mot de passe : **Paramètres → Mon profil**, carte « Changer le mot de passe »
   (10 caractères minimum, différent de l'actuel). Les autres sessions sont fermées, le
   changement est journalisé.

### Connexions suivantes

Identifiant, mot de passe, puis le code du moment. Un code vaut 30 secondes (une période de
tolérance de chaque côté) et ne sert qu'une fois. Une session admin dure **12 heures**.

### Blocages

- **5 mots de passe faux en 15 minutes** bloquent le compte 15 minutes. L'écran annonce encore
  30 minutes, à tort.
- 10 échecs de connexion admin par heure depuis une même adresse IP bloquent cette adresse
  une heure.
- À la deuxième étape, **5 codes faux** referment l'étape (il faut ressaisir le mot de passe) ;
  elle se referme aussi après 10 minutes, et un compte ne peut pas tenter plus de 10 codes par
  heure.
- Chaque tentative est journalisée : adresse IP, appareil, horodatage.

### Téléphone perdu

1. « Utiliser un code de secours » à l'écran du code.
2. Plus de codes : un autre administrateur supérieur ouvre **Paramètres → Administration des
   accès** et clique **« Réinitialiser la 2FA »** sur le compte (confirmation, journalisé). Le
   compte scanne un nouveau QR code à sa connexion suivante. Un compte déjà enrôlé ne peut pas
   se réenrôler avec son seul mot de passe.
3. Si plus aucun administrateur supérieur ne peut se connecter : un développeur passe
   `CODE_ADMIN_FOURNISSEUR=aucun` le temps d'une connexion (voir README).

### Mot de passe oublié

Lien « Mot de passe oublié ? » de la page de connexion. Un e-mail (Resend) porte un lien valable
30 minutes, à usage unique ; la page accepte 5 demandes par heure et par adresse IP. Après la
réinitialisation, l'administrateur n'est pas connecté d'office : il repasse par `/admin/login`,
mot de passe puis code. Une réinitialisation lève aussi un blocage en cours.

---

## 2. Ce que voit chaque compte

Un **administrateur supérieur** voit tout. Un administrateur de contenu reçoit ses **sections**
une à une (Paramètres → Administration des accès) ; une section non accordée est masquée, pas
grisée. Il n'accorde que des sections qu'il détient lui-même et ne peut agir ni sur son propre
compte ni sur un administrateur supérieur.

| Écran | Section requise |
|---|---|
| Vue d'ensemble | tous (ses blocs suivent les sections du compte) |
| CMS Site vitrine | cms-site-vitrine |
| Blog | blog |
| Référencement (SEO) | referencement-contenu |
| Programmes & phases, Modules & chapitres, Médiathèque vidéo | modules-chapitres |
| Fiches commerciales | fiches-commerciales, **et** modules-chapitres (sans elle, les données renvoient une erreur 403) |
| Prix d'un module, accès offert à un module | offres-commerciales |
| Formateurs | formateurs |
| Candidatures formateurs | candidatures-formateurs pour changer un statut ; formateurs pour créer le compte |
| Calendrier des sessions | calendrier-sessions |
| Coaching privé | coaching-prive |
| Apprenants | apprenants |
| Statistiques, Revenus | statistiques-performance |
| Performances | performances-marketing |
| Historique & versions | historique-versions |
| Attestations (révocation, signatures en lecture) | attestations |
| Paramètres → Administration des accès | administration-acces |
| Transactions & paiements | **rôle administrateur supérieur**, quelle que soit la case cochée |
| Slug, indexation, canonical | **rôle administrateur supérieur** (la case « Référencement avancé » est sans effet côté serveur) |

**Créer un administrateur** : nom, e-mail, WhatsApp, mot de passe provisoire (10 caractères
minimum) à transmettre soi-même : **aucune invitation n'est envoyée**. Un administrateur
supérieur voit en plus la case « Administrateur supérieur ». Le compte passe par le QR code à sa
première connexion.

**Révoquer un administrateur** : le compte redevient « apprenant », ses sections sont vidées et
son mot de passe effacé.

---

## 3. Le menu

| Écran | Rôle |
|---|---|
| Vue d'ensemble | Inscriptions payantes, chiffre d'affaires, marge, complétion, certificats ; top 5 des modules ; « À traiter » (demandes de coaching, candidatures, sessions à reprogrammer) ; prochaines sessions ; dernières transactions ; activité récente. |
| CMS Site vitrine | Blocs Accueil (chiffres clés, FAQ), Bannière, Programmes, Annonce, Légales ; témoignages. |
| Blog | Articles : contenu, référencement, publication. |
| Référencement (SEO) | Toutes les pages indexables : titre, description, image de partage. |
| Programmes & phases | Arborescence programme → phases : nom, couleur, date d'ouverture, publication. Publier un parent ne publie jamais ses enfants ; une phase ne se supprime que vide. |
| Fiches commerciales | Pages de vente des modules (onglets Toutes / Publiées / Annonces / Brouillons). Une fiche peut paraître en « Annonce » avant que le contenu existe. |
| Modules & chapitres | Contenu des modules ; duplication d'un module (copie en brouillon, sans vidéo) ou d'un chapitre. |
| Médiathèque vidéo | Toutes les vidéos déposées, les chapitres qui s'en servent, l'état d'encodage. Aperçu, Renommer, Encoder en multi-débit, Supprimer (seulement si aucun chapitre ne l'utilise). |
| Formateurs | Fiches publiques, ordre d'affichage, tarif et activation du coaching privé. |
| Calendrier des sessions | Coaching collectif : création, report, annulation, présence. |
| Coaching privé | Demandes de séances individuelles ; le badge compte celles à traiter. |
| Apprenants | Comptes, accès, attestations. |
| Candidatures formateurs | Formulaire public « Devenir formateur ». |
| Statistiques | Tableau par formateur en bas de Coaching privé : inscrits, complétion, présence, coaching privé. |
| Performances | Onglets Résumé, Ventes, Visites, Clients, Funnel. Les ventes viennent de la base ; visites et sources restent « — » (à consulter dans Google Analytics). |
| Revenus | CA (modules + coaching privé), frais FeexPay, marge, revenu Big Five, rémunération formateurs ; export CSV. |
| Historique & versions | « Journal des actions » : chaque action, son auteur, son détail ; export CSV. La restauration se fait depuis le CMS et l'onglet Historique d'un module, pas d'ici. |
| Paramètres | Six volets (section 10). |
| Transactions & paiements | Paiements et échecs (section 4). |

---

## 4. Ventes et paiements

Les paiements passent par **FeexPay, en production**. Seul le **Mobile Money** (Orange, MTN,
Moov) est ouvert ; Wave et la carte attendent leur activation chez FeexPay et sont annoncés
« Bientôt disponible » (le serveur les refuse).

- Une commande est confirmée au retour du navigateur ou par le webhook FeexPay, qui relit la
  transaction chez le prestataire. L'accès s'ouvre seul, l'apprenant reçoit un e-mail.
- Une commande en attente depuis plus de 15 minutes est redemandée à FeexPay par une tâche
  planifiée ; au bout de 24 h sans réponse, elle est close « délai dépassé ». **Sur Vercel, cette
  tâche tourne une fois par jour, à 4 h** ; pour un rythme horaire, un cron externe doit appeler
  `POST /api/taches/commandes` avec `Bearer TACHES_CLE`.
- **Transactions & paiements** est en lecture seule : échecs du mois par motif (solde
  insuffisant, validation MoMo expirée, refus opérateur, interruption réseau, carte refusée,
  double paiement, autre), colonne « suite » (payé J+1, relancé, sans suite), liste des
  transactions filtrable, export CSV. Les remboursements se font dans l'espace FeexPay. Le texte
  « relance automatique » de l'écran ne correspond à aucun envoi.

---

## 5. Coaching privé

Une demande arrive avec l'apprenant, le module, le formateur, l'objectif, la difficulté, une
durée de **1 à 3 h** et **3 à 14 créneaux** proposés.

1. **Confirmer + envoyer le lien de paiement** : choisir le créneau et la durée. Le prix est le
   tarif horaire du formateur × la durée. L'apprenant reçoit un e-mail.
2. L'apprenant clique **« Accepter et payer »** dans son espace (Mobile Money). La demande passe
   **« payée » seule** au paiement. « Marquer payée » reste en secours.
3. **Générer le lien de session** : la **réunion Zoom est créée automatiquement** (salle
   d'attente, fuseau Africa/Abidjan). Le champ lien n'est qu'un secours. Sans date et heure
   précises dans le créneau, la réunion démarre « maintenant ».
4. **Marquer réalisée** après la séance ; l'apprenant peut noter le formateur.

« Annuler » sur une carte ouvre le refus : motif obligatoire, transmis à l'apprenant. Chaque
étape est journalisée et visible de l'apprenant (« Suivi »). Statuts : en attente, en étude,
confirmée-attente de paiement, payée, réalisée, refusée, expirée, annulée par l'apprenant.

Limites connues :

- l'écran affiche un tarif fixe de 50 000 FCFA/h ; le montant facturé suit le tarif du formateur ;
- quand l'apprenant propose un autre créneau, la demande repasse « en étude » et sa carte n'a
  plus de bouton d'action ;
- aucune expiration automatique, aucun rappel sous 48 h, aucun événement Google Agenda (mode
  simulation) : surveiller le bloc « À traiter » ;
- seul l'apprenant reçoit un e-mail aux changements de statut ; le formateur n'est pas prévenu.

---

## 6. Sessions collectives

- **« Valider et créer la réunion Zoom »** crée la réunion automatiquement. Format fixe : 2 h,
  25 places. Une session par couple thématique–formateur et par mois (hors sessions annulées).
- **« Reporter et notifier »** déplace aussi la réunion Zoom ; **« Annuler et notifier »** la
  supprime. Tous les inscrits reçoivent un e-mail. « Modifier » et la création ne notifient
  personne.
- **Relever la présence** après chaque séance (nombre de participants) : c'est la seule source
  des taux de présence.

---

## 7. Apprenants

- **« + Ajouter un apprenant »** : un e-mail porte un lien pour choisir le mot de passe, valable
  72 h ; un module peut être offert d'emblée, avec motif.
- **« Attribuer un accès à un module »** (offres-commerciales) : motif obligatoire, journalisé,
  apprenant prévenu par e-mail.
- Panneau **Historique** : accès et leur origine (achat, attribution), « Révoquer » / « Rétablir »
  un accès (motif obligatoire) ; attestations : « Révoquer » / « Rétablir » (section attestations).
  Une attestation révoquée paraît invalide sur la page publique de vérification.
- **Suppression de compte par l'apprenant** : mot de passe ressaisi, compte désactivé, puis
  supprimé définitivement **14 jours plus tard** par la tâche de nuit, avec un rappel à J-3. Se
  reconnecter avant l'échéance le réactive. Commandes, transactions et attestations restent pour
  la comptabilité. Les comptes formateur et admin se ferment par l'équipe.

---

## 8. Formateurs et candidatures

**Candidatures formateurs** : « Marquer en étude », « Créer le compte formateur » (fiche publique
et compte créés en une fois, préremplis), « Refuser », « Rouvrir ». Le formateur reçoit par e-mail
un lien pour définir son mot de passe, valable 72 h, aussi affiché à l'écran ; un mot de passe
temporaire est possible à la place. Le bouton « Contacter sur WhatsApp » ouvre pour l'instant le
numéro de Big Five, pas celui du candidat.

**Formateurs** : colonnes Modules, Accès, Tarif coaching, Ordre public. La poignée ⋮⋮ fixe
l'ordre de `/formateurs`. « Modifier » ouvre la fiche publique (nom, expertise, bio, texte
alternatif du portrait, programme, « Fiche complète ») ; une fiche incomplète reste hors index et
hors sitemap. La case « Coaching privé » rend le formateur sélectionnable, ou non, dans les
nouvelles demandes ; les séances payées restent honorées. Le bouton final « Supprimer
définitivement » ne fait encore rien : la suppression se demande à un développeur.

---

## 9. Contenus et site public

- **Éditeur de module**, 8 onglets : Informations, Chapitres, Ressources, Quiz, Fiche
  commerciale, Offre & prix, Référencement et partage, Historique. « Marquer « Prêt » » est refusé
  tant que la liste de contrôle n'est pas remplie ; « Prêt » ne veut pas dire « en vente ».
  L'offre ne s'ouvre qu'avec promesse, « pourquoi » et au moins un chapitre ; la fermer ne retire
  jamais un accès acquis ; le prix exige offres-commerciales.
- **CMS Site vitrine** : par bloc, « Modifier », « Publier ce bloc sur le site », programmation
  « du … au … », historique des versions avec restauration. Les images de la bannière d'accueil
  se changent dans le bloc « Bannière » (champs « Image de fond » et « Visuel ») en y collant
  l'adresse de l'image ; vides, elles reviennent à `public/images/hero/<programme>.svg`.
- **Blog** : onglets Contenu, Référencement et partage, Publication. « Publier » est bloqué tant
  que le texte alternatif d'une image manque. Pas de restauration de version pour les articles.
- **Référencement** : changer un slug demande confirmation et crée une redirection permanente.
  Slug, indexation et canonical sont réservés au rôle administrateur supérieur.

---

## 10. Paramètres

| Volet | Contenu | Écriture |
|---|---|---|
| Administration des accès | Créer, modifier (sections), révoquer un administrateur ; réinitialiser sa 2FA ; activer le coaching privé d'un formateur. | section administration-acces ; 2FA : supérieur |
| Tracking & pixels | GTM (`GTM-KVFTGVVX`), GA4 (`G-7Y25B7NCW8`), Pixel Meta et jeton de l'API Conversions, TikTok, LinkedIn. « Déverrouiller » redemande le mot de passe ; chaque changement est journalisé avec l'ancienne valeur (le jeton : « valeur remplacée »). | GTM et code personnalisé : supérieur ; autres pixels : tout admin |
| Référencement · règles globales | Règles du site en lecture seule ; référentiels du profil apprenant (réseaux, outils, canaux de vente, tranches d'audience) : ajout, renommage, désactivation. | référentiels : tout admin |
| Attestations | Signature de la direction (dessinée ou image ≤ 256 Ko), nom sous la signature, signature de chaque formateur. S'applique aussi aux attestations déjà délivrées. | supérieur |
| Paramètres financiers | Frais FeexPay, parts Big Five / formateur (100 % au total), objectifs mensuels. Journalisé. | supérieur |
| Mon profil | Photo, nom complet, e-mail (mot de passe actuel demandé), WhatsApp, mot de passe. Le texte « code WhatsApp » de l'écran est périmé. | soi-même |

Le suivi des conversions (GA4 via GTM, Pixel Meta, API Conversions) ne part qu'avec le
consentement du visiteur et jamais depuis les espaces apprenant, formateur ou administration :
voir `app/plugins/tracking.client.ts` et `docs/tracking/email-questions-tracking.md`.

---

## 11. Prestataires

| Fonction | État |
|---|---|
| E-mails (invitations, réinitialisations, coaching, sessions, achats) | envoyés par Resend |
| WhatsApp | aucun envoi : pas de pilote, même là où l'écran annonce « e-mail + WhatsApp » |
| Code de connexion admin | TOTP (application), rien n'est envoyé |
| Paiement | FeexPay en production, Mobile Money seulement |
| Zoom | en production, réunions créées automatiquement |
| Google Agenda | simulation : aucun événement créé |
| Audience dans Performances | « — » : à lire dans Google Analytics |
| Relance des commandes en attente | quotidienne sur Vercel |

Le détail des comptes et clés est dans `TODO.md`.
