**Objet :** E-Masterclass Big Five — compte rendu de recette du 15/10 et mise à jour du 20/10/2026

Bonjour,

Voici le point de la recette du 15 octobre. La plateforme est en ligne à son adresse définitive : https://emasterclass.bigfive.solutions/

Sur 50 cas vérifiés :
- **32 sont validés** ;
- **10 attendent une action de votre part ou de FeexPay** ;
- **8 sont en ligne et restent à constater** sur un usage réel (achat, attestation, réservation…).

Aucun défaut n'est plus ouvert côté développement.

Le classeur de recette détaillé, avec une capture par point, est joint à ce message.

## Mise à jour du 20/10 : modules pilotes en ligne

Les 5 modules pilotes livrés le 20/10 sont intégrés et **publiés** :
- Entrepreneurs n° 4 « Comment construire une offre simple et commencer à vendre » (Lyle Soboro, 7 chapitres) ;
- Entrepreneurs n° 5 « Convertir les conversations en vente » (Lyle Soboro, 6 chapitres) ;
- Entrepreneurs n° 8 « Créer du contenu qui attire les clients » (Coury Othniel, 9 chapitres) ;
- Entrepreneurs n° 10 « Transformer TikTok en machine d’acquisition client » (Lyle Soboro, 7 chapitres), nouveau module ;
- Social Media n° 5 « Accroches qui stoppent le scroll & IA dans le copywriting » (Coury Othniel, 7 chapitres).

Chaque chapitre est servi en 720p et 1080p, avec ses sous-titres et sa transcription cliquable ; la lecture a été vérifiée sur ordinateur et sur mobile. La numérotation suit celle des dossiers livrés : « Être visible localement sur internet » passe en n° 7, et « Comprendre le business du client » (Jérémie De Clercq) en n° 11, sans autre changement. Les fiches précédentes des modules renommés sont conservées.

Les quiz livrés avec les modules seront intégrés dans une prochaine étape : la plateforme n’a pas encore de module de quiz.

## Compte de test : voir les vidéos sans payer

Un compte apprenant de test donne accès à tous les modules, sans passer par le paiement :
- connexion : https://emasterclass.bigfive.solutions/connexion
- identifiant : compte-test@bigfive.solutions
- mot de passe : communiqué dans l’e-mail envoyé (il n’est pas conservé dans ce dépôt)

Dans « Mes modules » et « Mes certificats », l’onglet « Disponibles » montre les 5 modules en vente, l’onglet « À venir » les 14 autres (brouillons et module en préparation), dont plusieurs ont déjà leurs vidéos. C’est un vrai compte sur la plateforme en ligne : la progression et les attestations y sont enregistrées comme pour un apprenant. Merci de ne pas changer son mot de passe et de ne pas le diffuser hors de l’équipe.

## Guide : mettre à jour les visuels des modules

Aucun module n’a encore de couverture : les cartes du catalogue affichent le visuel du programme. Pour en ajouter ou en changer une :
1. Se connecter à l’administration (https://emasterclass.bigfive.solutions/admin/login) avec un compte administrateur ou éditeur.
2. Ouvrir « Modules & chapitres », puis le module voulu.
3. Onglet « Fiche commerciale », bloc « Couverture » : cliquer sur « Déposer une image » (ou « Remplacer »). L’image est en ligne dès la fin de l’envoi.
4. Format : 1200 × 630 px, 2 Mo au maximum, en JPEG de préférence. Le PNG convient ; le WebP s’affiche sur le site, mais pas dans les aperçus Facebook et LinkedIn.
5. Renseigner le « Texte alternatif » (une phrase qui décrit l’image), puis cliquer sur « Enregistrer et publier » sans toucher au statut du module.

Une même couverture sert la fiche du module, sa carte dans le catalogue et l’aperçu quand le lien est partagé. L’image affichée dans le lecteur avant le lancement d’un chapitre est tirée de la vidéo elle-même (vers la 2e seconde) : pour la changer, il faut renvoyer la vidéo du chapitre avec le visuel voulu en ouverture.

## Ce qui fonctionne, vérifié en réel le 15/10

- **Paiement Mobile Money.** Un paiement Orange Money et un paiement MTN de 200 F ont réussi. Les commandes ont été confirmées, et les modules se sont ouverts automatiquement dans l'espace de l'acheteur. Moov est également ouvert.
- **Refus de paiement.** Le client voit un message clair, par exemple « Solde insuffisant ou plafond atteint », et chaque échec est tracé dans l'administration.
- **Zoom.** Chaque session de coaching créée dans l'administration génère automatiquement sa réunion sur le compte Zoom de Big Five, avec salle d'attente.
- **E-mails.** Ils partent par Resend depuis ne-pas-repondre@bigfive.solutions : la réinitialisation du mot de passe a été délivrée, et l'avis d'annulation de session est parti.
- **Domaine et vidéos.** Le site, le sitemap, le QR code des attestations et la lecture sécurisée des vidéos fonctionnent sur le domaine définitif, en HTTPS.
- **Administration.** La page de gestion des apprenants s'affiche de nouveau, export compris. Une séance passée s'affiche « Terminée » au lieu de « En direct ».

## Ce qui attend Big Five

1. **FeexPay — Wave.** FeexPay refuse Wave tant que la « Clé agrégée Wave » n'est pas activée (tableau de bord FeexPay, onglet Configuration). Si l'option n'est pas disponible, il faut la demander au support FeexPay. En attendant, Wave apparaît « Bientôt disponible » sur le site.
2. **FeexPay — carte (Visa, Mastercard, Djamo).** Le dossier de conformité carte (KYC) est resté en brouillon. Il faut le compléter et le soumettre dans le tableau de bord FeexPay. À savoir : FeexPay peut retenir une partie de chaque paiement par carte pendant 180 jours, pour couvrir les litiges.
3. **Mots de passe.** Les mots de passe de démonstration des six comptes concernés, dont l'administrateur principal cossi@bigfiveabidjan.com, ont été renouvelés le 15/10. Chaque titulaire reçoit le sien et le change à sa première connexion (Paramètres › Mot de passe).
4. **E-mails.** Dans Cloudflare, ne garder qu'un seul enregistrement DMARC sur _dmarc.bigfive.solutions. Deux coexistent aujourd'hui : supprimer « v=DMARC1; p=none; ». Vérifier aussi que la boîte contact@bigfiveabidjan.com existe : c'est elle qui reçoit le formulaire de contact.
5. **Contenus.**
   - Textes juridiques validés : CGU, CGV, mentions légales, confidentialité, cookies.
   - Vidéos des modules : 49 chapitres sur 88 sont en ligne au 20/10.
   - Couvertures des modules (voir le guide ci-dessus).
   - Publication des 11 modules encore en brouillon.
   - Griffe de signature de la direction, pour les attestations.
   - Biographies des formateurs.
6. **Mesure d'audience.** Fournir les identifiants Google Analytics 4 et Google Tag Manager, et déclarer le domaine dans la Search Console.
7. **Paiements de test.** Rembourser les deux paiements de 200 F depuis la console FeexPay, puis remettre les prix des modules à leur valeur.
8. **Rappel : accès à bigfiveacademy.com.** Merci de me transmettre les accès à bigfiveacademy.com, toujours en attente.

**À confirmer avec FeexPay :** leur fenêtre de paiement ajoute des frais de 1,7 % à 3,2 % selon le réseau, à la charge du client.

## Mis en ligne ce soir

Les deux mises à jour de la base ont été exécutées, et les derniers développements sont en ligne depuis le 15/10 au soir :
- l'e-mail de confirmation d'achat ;
- l'envoi de l'attestation par e-mail ;
- la relance automatique, chaque nuit, des commandes restées en attente ;
- les paiements de coaching privé dans les transactions ;
- le verrouillage des droits de la base, vérifié.

## Prochaines étapes

- Constater en usage réel :
  - les e-mails, au prochain achat et à la prochaine attestation ;
  - la relance, après sa première exécution cette nuit ;
  - un paiement de coaching privé.
- Tester l'entrée dans la salle Zoom (formateur et apprenant), puis le report et l'annulation d'une session.

Je reste disponible pour en parler.

Cordialement,
Jean-Luc Houédanou

---

## Annexe technique — défauts D1 à D3

Vérifications faites le 15/10 au soir sur la base en ligne, sans écriture en base. Détail dans le classeur, onglet « En attente client », partie 2.

| N° | Défaut | État | Cas |
|---|---|---|---|
| D1 | /admin/apprenants répondait une erreur 500 | Corrigé (27d835b), vérifié | ADM-12 à retester, ADM-14 OK |
| D2 | Mots de passe de démonstration encore actifs | Renouvelés le 15/10, vérifié | SEC-11 OK |
| D3 | Séance passée affichée « EN DIRECT · 621 h » | Corrigé (27d835b, 2bc3bcc), vérifié | COL-05 OK |

**D1.** Une fusion de branches avait gardé une API qui renvoie `{ apprenants, choix }` alors que l'écran attendait une simple liste. L'écran ne retient plus que `apprenants`, ce qui répare aussi l'export CSV. Vérifié : liste de 10 comptes, fiche, historique, export (10 lignes, 13 colonnes), formulaire avec Prénom et Nom séparés. Reste à créer un apprenant de test. Captures : ADM-12 (avant) et ADM-12-corrige (après).

**D2.** Six comptes sur sept acceptaient encore le mot de passe commun du jeu de données : cossi@, jeremie.declercq@, houefa@bigfiveabidjan.com, editeur@ et formateur@bigfive.ci, aya@example.ci. Ils ont été renouvelés le 15/10 au soir, et un nouveau contrôle en lecture seule confirme qu'aucun compte n'accepte plus ce mot de passe. Il n'apparaît plus non plus dans le README ni dans le TODO. Procédure suivie, depuis un poste dont le `.env` pointe sur la base en ligne :

```bash
npm run auth:renouveler
npm run auth:renouveler -- --appliquer
```

1. Le premier appel ne fait que lire : il liste les comptes concernés.
2. Le second tire un mot de passe aléatoire de 24 caractères par compte, l'enregistre haché, puis l'affiche **une seule fois** dans le terminal, sans rien écrire sur le disque.
3. Reporter chaque mot de passe dans un gestionnaire et le transmettre à son titulaire. **Reste à faire :** remplacer `NUXT_SESSION_PASSWORD` sur Vercel et redéployer, pour fermer les sessions déjà ouvertes.

**D3.** Le badge ne comparait l'heure qu'au début de la séance. La séance passée affiche désormais « TERMINÉE · 19 septembre à 20:00 », avec un bouton d'entrée grisé, y compris pour l'hôte. Captures : COL-05-seance-passee (avant) et COL-05-corrige (après).

**Contrôles.** `npm run typecheck` passe sans aucune erreur le 15/10 au soir. Les compteurs de la Synthèse du classeur se recalculent à l'ouverture dans Excel ; un aperçu rapide peut les montrer vides.
