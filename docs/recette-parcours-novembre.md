# Recette des parcours — novembre 2026

Pour Franck et Cossi. Cinq parcours à jouer de bout en bout sur
`https://emasterclass.bigfive.solutions`, avec un compte apprenant de test et, pour le coaching,
un compte formateur. Notez pour chaque étape : OK, ou ce qui s'affiche à la place, avec une
capture.

**Avant de commencer.** Les scripts SQL 48 et 49 et le nettoyage des articles doivent être
passés sur la base (voir `TODO.md`). Zoom doit être en mode `live`.

---

## 1. Achat complet

| Étape | Attendu |
|---|---|
| Fiche d'un module non acheté → « Acheter ce module » | Tunnel : compte, récapitulatif, paiement |
| Paiement **Mobile Money** (Orange ou MTN) | Écran de confirmation, accès au module ouvert |
| E-mail | « Votre paiement est confirmé » : module, montant, moyen, référence |
| Admin → Transactions | La transaction apparaît, statut réussie |
| Mon espace → Historique d'achats | La commande, avec sa référence |

**Bloqué, hors code :**
- Wave, en attente de son activation par FeexPay.
- Carte, en attente du KYC carte.

Il n'y a pas de reçu PDF : le reçu, c'est l'e-mail de confirmation et l'historique.

## 2. Certification

| Étape | Attendu |
|---|---|
| Regarder toutes les vidéos du module | Progression à 100 % |
| Quiz : 10 questions, 100 % requis, 3 tentatives par jour | « Quiz réussi » |
| Mon espace → Attestations → demander l'attestation | Page imprimable avec QR code (Imprimer → PDF) |
| E-mail | « Votre attestation est prête », avec le lien et le numéro |

La signature de Jérémie n'est pas encore fournie : l'emplacement « Direction » est vide ou
affiche le nom par défaut. Elle se téléverse dans Admin → Paramètres → Attestations, et
s'applique aussi aux attestations déjà délivrées.

## 3. Coaching collectif (Zoom réel)

| Étape | Attendu |
|---|---|
| Admin → Calendrier : créer une session aujourd'hui, dans 30 min | La réunion Zoom est créée |
| Apprenant (avec un module de la thématique et sa fiche complète) → Mes sessions → Réserver | Place réservée, **e-mail de confirmation** avec l'accès à la salle |
| Formateur → Mes sessions → la salle, 15 min avant | « Démarrer la session » : la réunion démarre (hôte) |
| Apprenant → « Rejoindre la session » | Entre dans la salle d'attente, puis dans la réunion |

À vérifier en priorité : que le formateur **démarre** bien la réunion. S'il reste « en attente de
l'hôte », c'est qu'il manque à l'application Zoom la portée `user:read:zak:admin`.

## 4. Coaching privé

| Étape | Attendu |
|---|---|
| Apprenant → fiche formateur → « Réserver un coaching privé » → demande avec 3 créneaux | Demande « en attente » |
| Admin → Coaching privé → Confirmer : créneau, durée | E-mail à l'apprenant avec le montant (heures × tarif du formateur) |
| Apprenant → « Accepter et payer » → Mobile Money | Demande « payée », e-mail de confirmation |
| Admin → Planifier : **date et heure réelles** | Réunion Zoom à cette date ; e-mails à l'apprenant et au formateur |
| Formateur → Coaching privé → salle | Démarre la réunion |
| Apprenant → salle | Rejoint la réunion |

## 5. Live Session

| Étape | Attendu |
|---|---|
| Admin → Live Sessions → nouvelle séance **gratuite**, statut Publiée | Visible sur /live-sessions et sur l'accueil |
| Visiteur → fiche | Prérequis, ce que l'on apprend, formateur, date, prix |
| « Se connecter pour s'inscrire » → connexion → « Je m'inscris » | « Vous êtes inscrit », e-mail avec l'accès à la salle et le lien Zoom |
| Mon espace → Mes sessions → « Vos Live Sessions » | La séance ; « Rejoindre » 15 min avant |
| Formateur → Mes sessions → « Mes Live Sessions » → Démarrer | Démarre la réunion |

**Pas encore en place :**
- Les rappels automatiques (veille et une heure avant). Ils demandent l'offre Vercel Pro.
- L'inscription en ligne aux séances **payantes**. La fiche affiche le prix et renvoie vers le
  contact, en attendant que Big Five arbitre le paiement.

---

## Tracking (avec le mode Preview de GTM)

Suivez la checklist de `docs/tracking/gtm-import.md` :
- **Refus des cookies** : rien ne part.
- **Mesure d'audience seule** : GA4, sans Meta.
- **Marketing** : Meta.
- **Module déjà acheté** : pas de ViewContent.
- **Achats** : Purchase avec `content_category` `module` ou `coaching_prive`.
