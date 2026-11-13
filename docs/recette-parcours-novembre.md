# Recette des parcours — novembre 2026

> **Depuis le 13/11, la recette se joue dans le back-office : Admin → Recette
> (`/admin/recette`).** Chaque testeur y marque OK, KO ou Passé et y lit les résultats des
> autres. Les contrôles sont décrits dans `server/data/recette.ts` ; ce document reste la
> version à lire hors ligne.

Pour Franck et Cossi. Cinq parcours à jouer de bout en bout sur
`https://emasterclass.bigfive.solutions`, avec un compte apprenant de test et, pour le coaching,
un compte formateur. Notez pour chaque étape : OK, ou ce qui s'affiche à la place, avec une
capture.

**Avant de commencer.** Les scripts SQL 48 à 51, le nettoyage des articles et la planification
pg_cron des Live Sessions doivent être passés sur la base (voir `TODO.md`). Zoom doit être en
mode `live`.

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

Le site n'est pas lancé : on teste directement en ligne, sans précaution particulière (les
revenus de test peuvent rester). Le parcours détaillé est dans « Recette Live Sessions —
E-Masterclass.xlsx » (CDC v1.3).

**Préparer.** Admin → Live Sessions → réglage « visible sur le site pour » → **Tout le monde**.
Créer une séance qui commence **dans 1 h 15**, puis Publier.

| # | Qui | Étape | Attendu |
|---|---|---|---|
| 1 | Visiteur | /live-sessions, puis l'accueil | La séance apparaît dans les deux |
| 2 | Visiteur | Fiche de la séance | Prérequis, ce que l'on apprend, formateur, date, prix (celui du module) |
| 3 | Apprenant | « Se connecter pour s'inscrire » → CGV → Mobile Money | Fenêtre FeexPay au prix du module, puis « Vous êtes inscrit » |
| 4 | Apprenant | Boîte mail | Confirmation : horaire, formateur, prérequis, reçu, `.ics` joint ; **aucun lien Zoom** |
| 5 | Admin | Transactions | L'inscription apparaît comme un achat du module |
| 6 | Apprenant | Mon espace → Tableau de bord | La carte de la séance, en tête de page, avec « Ajouter à mon agenda » |
| 7 | Formateur | Boîte mail | Rappel J-1 du formateur (au premier passage du cycle, 5 min au plus) |
| 8 | Formateur | Mes Live Sessions, à H-30 | « Animer sur Zoom » actif → la réunion **démarre** en hôte |
| 9 | Apprenant | Boîte mail, à H-10 | Rappel H-10 avec le lien de la salle |
| 10 | Apprenant | Salle, à H-15 puis au début | Salle ouverte, entre dans la réunion |
| 11 | Apprenant | Boîte mail, au début | Rappel H0 |
| 12 | Admin | « Terminer » la séance (ou attendre début + durée + 60 min) | Quiz et support ouverts côté apprenant |
| 13 | Admin | Déposer le support | E-mail de fin aux inscrits |

**Si ça coince :**
- Le formateur reste « en attente de l'hôte » (étape 8) : il manque la portée Zoom
  `user:read:zak:admin`.
- Aucun rappel, séance toujours « Publiée » après l'heure : le cycle pg_cron n'est pas planifié
  (`supabase/planification-live.sql`).
- L'apprenant ne reçoit pas J-1 : normal, il s'est inscrit à moins de 24 h. Pour le tester,
  s'inscrire à une séance du lendemain.

**Bloqué, hors code :** Wave et carte, comme pour l'achat d'un module (§1).

---

## Tracking (avec le mode Preview de GTM)

Suivez la checklist de `docs/tracking/gtm-import.md` :
- **Refus des cookies** : rien ne part.
- **Mesure d'audience seule** : GA4, sans Meta.
- **Marketing** : Meta.
- **Module déjà acheté** : pas de ViewContent.
- **Achats** : Purchase avec `content_category` `module`, `coaching_prive` ou `live_session`.
