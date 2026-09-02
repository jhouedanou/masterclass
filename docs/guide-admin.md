# Guide de l'administration — E-Masterclass Big Five

Ce guide s'adresse à l'équipe qui gère la plateforme depuis le back-office. Il décrit les
écrans un à un, dans l'ordre où l'équipe s'en sert, et précise ce qui est automatique, ce qui est
journalisé et ce qui reste à faire à la main tant que certains prestataires ne sont pas branchés.

Adresse du back-office : `/admin`. Comptes de démonstration : voir le README (mot de passe commun,
à changer avant l'ouverture publique).

---

## 1. Se connecter

1. Ouvrir `/admin/login`. Un compte d'administration **ne peut pas** passer par la page de
   connexion du site : il y est renvoyé vers `/admin/login`.
2. Saisir l'e-mail et le mot de passe. Chaque tentative est journalisée (adresse IP, appareil,
   horodatage). **Cinq échecs en trente minutes bloquent le compte trente minutes.**
3. Saisir le code à six chiffres reçu par e-mail. Il vaut dix minutes ; « Renvoyer le code » en
   émet un nouveau, au plus un par minute.

Le code est envoyé par Supabase Auth. Si rien n'arrive : vérifier les indésirables, puis que le
gabarit « Magic Link » du projet Supabase contient bien `{{ .Token }}` (Authentication → Email
Templates). Le SMTP intégré de Supabase est limité à quelques e-mails par heure ; au-delà,
brancher un SMTP personnalisé (Authentication → SMTP Settings).

**Mot de passe oublié** : lien « Mot de passe oublié ? » sur la page de connexion. Tant qu'aucun
fournisseur d'e-mail n'est branché pour la plateforme, le lien de réinitialisation s'écrit dans la
sortie du serveur : un développeur le transmet.

**Changer son mot de passe** : Paramètres → Mon profil. Le changement est journalisé.

---

## 2. Ce que voit chaque compte

Un compte d'administration reçoit ses **sections** une à une (Paramètres → Administration des
accès). Une section non accordée est masquée, pas seulement grisée. Deux droits ne peuvent être
accordés que par un administrateur supérieur : **Transactions & paiements** et **Référencement
avancé** (slugs publiés, indexation, canonicals).

| Groupe | Écran | Droit |
|---|---|---|
| Pilotage | Vue d'ensemble | tous |
| Pilotage | Performances | performances-marketing |
| Pilotage | Revenus | statistiques-performance |
| Pilotage | Transactions | transactions-paiements (admin supérieur) |
| Contenus | Modules et chapitres, CMS, Blog, Référencement | modules-chapitres, cms-site-vitrine, blog, referencement-contenu |
| Communauté | Formateurs, Calendrier des sessions, Coaching privé, Apprenants | formateurs, calendrier-sessions, coaching-prive |
| Administration | Accès, Tracking, Historique, Paramètres | administration-acces, historique-versions |

Un compte ne peut pas se révoquer lui-même.

---

## 3. Coaching privé — traiter une demande

Écran **Coaching privé**. Tarif fixe : 50 000 FCFA par heure. Aucun paiement n'est demandé avant
confirmation.

Une demande arrive avec : l'apprenant, le module, le formateur choisi, l'objectif et la difficulté
qu'il a décrits, la durée souhaitée (1 à 4 h), jusqu'à trois créneaux proposés.

Le circuit, bouton par bouton :

1. **Confirmer + envoyer le lien de paiement** — choisir le créneau retenu (parmi ceux proposés,
   ou un autre convenu avec le formateur), ajouter un commentaire si besoin. La demande passe
   « Confirmée — en attente de paiement ». *Le lien de paiement FeexPay est à envoyer à la main
   tant que FeexPay n'est pas branché.*
2. **Marquer payée** — une fois l'encaissement constaté.
3. **Planifier + générer le lien de session** — saisir le créneau définitif et le lien Zoom
   (créé dans Zoom). L'apprenant et le formateur voient alors le lien dans leur espace.
4. **Marquer réalisée** — après la séance. L'apprenant peut alors noter le formateur.

**Refuser** est possible tant que la demande n'est pas payée ; le motif est obligatoire et
transmis tel quel à l'apprenant. L'apprenant peut lui-même retirer sa demande tant qu'elle n'est
pas payée.

Chaque action est journalisée et laisse une trace datée visible par l'apprenant (« Suivi » sous
chaque demande). Les filtres en haut de l'écran isolent les demandes à traiter.

---

## 4. Formateurs et candidatures

Écran **Formateurs**.

**Coaching privé : Simple / Activé.** La case de la colonne « Coaching privé » ouvre ou referme la
section dans l'espace du formateur et le rend sélectionnable, ou non, dans les demandes des
apprenants. Repasser « Simple » retire le formateur des nouvelles demandes ; les séances déjà
payées restent honorées. Action journalisée.

**Candidatures** (formulaire public « Devenir formateur »). Pour chacune :

- **Marquer en étude** puis, si elle est retenue, **Créer le compte formateur** : la fiche
  publique et le compte sont créés en une fois, préremplis depuis la candidature. Deux options
  d'accès : un **lien pour définir le mot de passe** (valable 72 h) ou un **mot de passe
  temporaire** que vous lui communiquez. Le lien s'affiche à l'écran : transmettez-le tant que
  l'envoi automatique n'est pas branché.
- **Refuser** ferme la candidature ; « Rouvrir » la remet en file.

La fiche publique naît incomplète et hors index : le formateur la complète depuis son espace
(Mon profil), et elle apparaît sur `/formateurs` une fois renseignée. Le bouton « + Ajouter un
formateur » ouvre la même fenêtre, à vide.

---

## 5. Apprenants

Écran **Apprenants** : liste filtrable, fiche persona (secteur, expérience, réseaux, objectif)
transmise aux formateurs avant une session. **Attribuer un accès** offre un module sans achat :
motif obligatoire, journalisé, apprenant prévenu.

Un apprenant peut supprimer son compte depuis ses paramètres. Le compte disparaît pour lui
(connexion impossible, e-mail libéré) mais ses commandes, transactions et certificats restent en
base pour la comptabilité.

---

## 6. Sessions de coaching collectif

Écran **Calendrier des sessions** : création d'une session par thématique (une seule par
thématique et par date), report, annulation. Les inscrits sont prévenus par e-mail et WhatsApp
dès que les envois sont branchés. *La réunion Zoom se crée à la main pour l'instant.*

**Relever la présence** après chaque séance (colonne Présence) : sans ce relevé, les taux de
participation restent vides côté formateur et dans les statistiques.

---

## 7. Contenus : modules, blog, référencement

**Modules et chapitres** → éditeur d'un module, six onglets : Informations, Chapitres,
Ressources, Offre, **Référencement et partage**, Historique. L'offre ne s'ouvre pas sans promesse,
« pourquoi » et au moins un chapitre. Un brouillon n'est ni visible, ni indexable, ni dans le
sitemap.

**Blog** → « + Nouvel article » ou « Modifier ». L'éditeur a deux onglets : Contenu (titre,
chapô, corps en Markdown, catégorie, auteur, image, modules liés, « à la une ») et Référencement
et partage. « Publier » rend l'article visible et l'ajoute au sitemap ; « Dépublier » l'en retire.

**Référencement (SEO)** : la liste de toutes les pages indexables. Le panneau de droite est le
même que l'onglet des éditeurs : ce qui est modifié à un endroit apparaît à l'autre. Un changement
de slug demande confirmation et crée automatiquement une redirection permanente. Les champs slug,
indexation et canonical sont réservés à l'administrateur supérieur.

**CMS du site** : hero, bandeau, témoignages. **Historique** : toute écriture conserve la version
précédente, restaurable en un clic.

---

## 8. Transactions et échecs de paiement

Écran **Transactions** (administrateur supérieur). Lecture seule : la source comptable reste
FeexPay. Le bandeau du haut compte les échecs sur trente jours et les répartit par motif — solde
insuffisant, annulé par l'utilisateur, délai dépassé, opérateur indisponible, carte refusée,
erreur inconnue. Cliquer un motif filtre la liste.

*FeexPay n'est pas encore branché* : la commande s'enregistre et l'accès s'ouvre sans
encaissement réel. En développement, le tunnel permet de simuler chacun des six échecs.

---

## 9. Paramètres

- **Répartition et frais** (administrateur supérieur) : frais de paiement, parts Big Five /
  formateur (total 100 %), objectifs mensuels. Journalisé.
- **Mon profil** : identité, e-mail, changement de mot de passe.
- **Administration des accès** : création d'un compte admin, sections cochées une à une,
  révocation.
- **Tracking et pixels** : écran verrouillé, déverrouillage par ressaisie du mot de passe, chaque
  changement journalisé avec son ancienne valeur.

---

## 10. Ce qui attend encore un prestataire

| Fonction | État | Contournement |
|---|---|---|
| E-mails et WhatsApp de la plateforme (invitations, suivi coaching, sessions, réinitialisation) | pilote « console » : le message s'écrit dans la sortie du serveur | transmettre à la main ; le lien d'invitation formateur s'affiche aussi à l'écran |
| Code de connexion admin | envoyé par Supabase Auth | compléter le gabarit Magic Link avec `{{ .Token }}` |
| Paiement FeexPay | simulé | envoyer le lien de paiement à la main, marquer « payée » soi-même |
| Zoom | lien saisi à la main | créer la réunion dans Zoom, coller le lien à la planification |
| Mesures d'audience (Performances) | « — » tant que GA4/GTM ne sont pas saisis dans Tracking | — |

Le détail des comptes et clés à obtenir est dans `TODO.md`.
