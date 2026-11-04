# Recette des parcours — novembre 2026

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

Le parcours détaillé est dans « Recette Live Sessions — E-Masterclass.xlsx » (CDC v1.3).

**Pour tester sans montrer la fonctionnalité au public** : Admin → Live Sessions, réglage
« visible sur le site pour » → **Admins seulement**. Les visiteurs reçoivent une 404, le sitemap
ne liste rien ; jouez le parcours avec un compte admin. À la fin, remettez le réglage voulu et
annulez la séance de test.

| Étape | Attendu |
|---|---|
| Admin → Live Sessions → nouvelle séance, puis Publier | Visible sur /live-sessions et sur l'accueil |
| Visiteur → fiche | Prérequis, ce que l'on apprend, formateur, date, prix (celui du module) |
| « Se connecter pour s'inscrire » → connexion → CGV cochées → paiement **Mobile Money** | Fenêtre FeexPay au prix du module, puis « Vous êtes inscrit » |
| E-mail de confirmation | Horaire, formateur, prérequis, lien vers le reçu, fichier agenda `.ics` joint ; **aucun lien Zoom** (CDC, option B) |
| Admin → Transactions | L'inscription compte comme un achat du module |
| Mon espace → Mes sessions → « Vos Live Sessions » | La séance ; la salle s'ouvre 15 min avant le début |
| Formateur → Mes Live Sessions → « Animer sur Zoom », 30 min avant | La réunion **démarre** (hôte) |
| Apprenant → salle intégrée | Entre dans la réunion |
| Rappels J-1, H-10, H0 | Chacun porte le lien de la salle de la plateforme. Une inscription tardive ne reçoit pas les rappels dont l'heure est passée |
| Fin : « Terminer » côté admin, ou automatiquement au début + durée + 60 min | Quiz et support ouverts ; e-mail de fin dès que le support est déposé |

Pour voir H-10 et H0 sans attendre, créez la séance environ une heure à l'avance. L'apprenant
inscrit à moins de 24 h ne reçoit pas J-1 (marqué comme passé) ; le formateur, lui, reçoit son
rappel J-1. Pour tester J-1 côté apprenant, inscrivez-vous plus de 24 h avant la séance. Les rappels et les changements de statut passent par le cycle pg_cron toutes les
5 minutes (`supabase/planification-live.sql`) ; s'il n'est pas planifié, rien ne part et la
séance reste « Publiée ».

À vérifier en priorité : que le formateur **démarre** bien la réunion. S'il reste « en attente
de l'hôte », il manque à l'application Zoom la portée `user:read:zak:admin` (même condition que
pour le coaching).

**Bloqué, hors code :** Wave et carte, comme pour l'achat d'un module (§1).

---

## Tracking (avec le mode Preview de GTM)

Suivez la checklist de `docs/tracking/gtm-import.md` :
- **Refus des cookies** : rien ne part.
- **Mesure d'audience seule** : GA4, sans Meta.
- **Marketing** : Meta.
- **Module déjà acheté** : pas de ViewContent.
- **Achats** : Purchase avec `content_category` `module`, `coaching_prive` ou `live_session`.
