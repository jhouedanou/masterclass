**Objet :** E-Masterclass Big Five — compte rendu de recette du 15/10/2026

Bonjour,

Voici le point de la recette du 15 octobre. La plateforme est en ligne à son adresse définitive : https://emasterclass.bigfive.solutions/

Sur 50 cas vérifiés :
- **30 sont validés** ;
- **10 attendent une action de votre part ou de FeexPay** ;
- **9 sont à revérifier en ligne** après le déploiement de ce soir ;
- **1 reste ouvert** : les mots de passe de démonstration.

Le classeur de recette détaillé, avec une capture par point, est joint à ce message.

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
3. **Sécurité.** Six comptes, dont l'administrateur principal cossi@bigfiveabidjan.com, acceptent encore le mot de passe de démonstration. Une procédure de renouvellement est prête : nous la lançons avec vous, puis chaque titulaire reçoit son nouveau mot de passe.
4. **E-mails.** Dans Cloudflare, ne garder qu'un seul enregistrement DMARC sur _dmarc.bigfive.solutions. Deux coexistent aujourd'hui : supprimer « v=DMARC1; p=none; ». Vérifier aussi que la boîte contact@bigfiveabidjan.com existe : c'est elle qui reçoit le formulaire de contact.
5. **Contenus.**
   - Textes juridiques validés : CGU, CGV, mentions légales, confidentialité, cookies.
   - Vidéos des modules : 15 chapitres sur 72 sont en ligne.
   - Publication des 15 modules encore en brouillon.
   - Griffe de signature de la direction, pour les attestations.
   - Biographies des formateurs.
6. **Mesure d'audience.** Fournir les identifiants Google Analytics 4 et Google Tag Manager, et déclarer le domaine dans la Search Console.
7. **Paiements de test.** Rembourser les deux paiements de 200 F depuis la console FeexPay, puis remettre les prix des modules à leur valeur.

**À confirmer avec FeexPay :** leur fenêtre de paiement ajoute des frais de 1,7 % à 3,2 % selon le réseau, à la charge du client.

## Ce que nous faisons ce soir et ensuite

- **Ce soir :** deux mises à jour de la base, puis la mise en ligne des derniers développements :
  - l'e-mail de confirmation d'achat ;
  - l'envoi de l'attestation par e-mail ;
  - la relance automatique des commandes restées en attente ;
  - les paiements de coaching privé dans les transactions ;
  - le verrouillage des droits de la base.
- **Ensuite :** vérifier ces points en ligne, puis tester l'entrée dans la salle Zoom (formateur et apprenant), ainsi que le report et l'annulation d'une session.

Je reste disponible pour en parler.

Cordialement,
Jean-Luc Houédanou

---

## Annexe technique — défauts D1 à D3

Vérifications faites le 15/10 au soir sur la base en ligne, sans écriture en base. Détail dans le classeur, onglet « En attente client », partie 2.

| N° | Défaut | État | Cas |
|---|---|---|---|
| D1 | /admin/apprenants répondait une erreur 500 | Corrigé (27d835b), vérifié | ADM-12 à retester, ADM-14 OK |
| D2 | Mots de passe de démonstration encore actifs | Script prêt, à lancer | SEC-11 KO |
| D3 | Séance passée affichée « EN DIRECT · 621 h » | Corrigé (27d835b, 2bc3bcc), vérifié | COL-05 OK |

**D1.** Une fusion de branches avait gardé une API qui renvoie `{ apprenants, choix }` alors que l'écran attendait une simple liste. L'écran ne retient plus que `apprenants`, ce qui répare aussi l'export CSV. Vérifié : liste de 10 comptes, fiche, historique, export (10 lignes, 13 colonnes), formulaire avec Prénom et Nom séparés. Reste à créer un apprenant de test. Captures : ADM-12 (avant) et ADM-12-corrige (après).

**D2.** Six comptes sur sept acceptent encore le mot de passe commun du jeu de données : cossi@, jeremie.declercq@, houefa@bigfiveabidjan.com, editeur@ et formateur@bigfive.ci, aya@example.ci. Seul jeanluc@ a été changé. Le mot de passe n'apparaît plus dans le README ni dans le TODO. Procédure, depuis un poste dont le `.env` pointe sur la base en ligne :

```bash
npm run auth:renouveler
npm run auth:renouveler -- --appliquer
```

1. Le premier appel ne fait que lire : il liste les comptes concernés.
2. Le second tire un mot de passe aléatoire de 24 caractères par compte, l'enregistre haché, puis l'affiche **une seule fois** dans le terminal, sans rien écrire sur le disque.
3. Il faut ensuite reporter chaque mot de passe dans un gestionnaire, le transmettre à son titulaire, remplacer `NUXT_SESSION_PASSWORD` sur Vercel et redéployer, pour fermer les sessions déjà ouvertes.

**D3.** Le badge ne comparait l'heure qu'au début de la séance. La séance passée affiche désormais « TERMINÉE · 19 septembre à 20:00 », avec un bouton d'entrée grisé, y compris pour l'hôte. Captures : COL-05-seance-passee (avant) et COL-05-corrige (après).

**Contrôles.** `npm run typecheck` passe sans aucune erreur le 15/10 au soir. Les compteurs de la Synthèse du classeur se recalculent à l'ouverture dans Excel ; un aperçu rapide peut les montrer vides.
