# Reste à faire — E-Masterclass Big Five

Point au **2 septembre 2026**. Le développement est à jour ; ce qui suit se commande, se fournit ou
s'exécute. Le détail à transmettre à la direction de projet est dans la note partagée
« Ouvrir E-Masterclass ».

---

## 1. À exécuter dans SQL Editor — rien à faire

Tout est appliqué sur le projet hébergé. Vérifié le 02/09 en interrogeant la base :

- [x] **`supabase/en-ligne/06-video.sql`** — colonnes `video_cle` et `video_duree_secondes` sur
      `chapitres`, table `visionnages` et fonction `enregistrer_visionnage()` en place
- [x] **`supabase/en-ligne/rattrapage-videos.sql`** — les deux chapitres de démonstration du module
      « Accroches qui stoppent le scroll » portent bien `demo-accroches-ch01` et `ch02` (31 s chacun)
- [x] **`supabase/en-ligne/07-parcours-planche-e.sql`** — appliqué le 02/09, avec
      `rattrapage-planche-e.sql` (données de démonstration des nouveaux parcours)

Les 70 autres chapitres n'ont pas de vidéo : le lecteur y affiche son écran d'attente, comme prévu,
jusqu'à ce que les tournages soient livrés (voir §3).

---

## 2. Base de données — à jour

Vérifié le 02/09 sur le projet hébergé : les cinq migrations (`01` à `05`), le rattrapage des mots
de passe et le jeu de données sont en place. Les comptages (18 modules, 72 chapitres, 5 articles,
5 blocs vitrine, 6 comptes tous pourvus d'un mot de passe) correspondent aux migrations locales.
`npm run db:verifier`, `npm run typecheck` et `npm run build` passent au vert.

---

## 3. Bloqué par un prestataire

Rien de tout cela ne peut avancer sans un compte ou des clés. Les trois premiers **interdisent une
ouverture au public**.

### Vidéo — l'hébergeur est réglé, restent les contenus
La diffusion est en place : transcodage HLS par `ffmpeg`, stockage Cloudflare R2, autorisations
signées vérifiées par un Worker. Aucun abonnement, voir la section « Vidéo » du README. Deux
vidéos de démonstration tournent déjà de bout en bout.

- [x] Bucket R2 créé, Worker déployé et vérifié le 02/09 — `https://emasterclass-videos.analyticsbigfive.workers.dev`.
      Les deux vidéos de démonstration se lisent depuis le CDN, une autorisation d'un chapitre
      ne donne pas accès à un autre.
- [ ] Obtenir **les 18 vidéos** montées et validées — c'est le vrai sujet, et il reste entier
- [ ] Récupérer les transcriptions (script synchronisé sous le lecteur)

**Sans les vidéos, l'écran de lecture affiche son message d'attente.**

### FeexPay — encaissement
- [ ] Ouvrir le compte marchand au nom de BigFiveAbidjan SARL (RCCM, pièce d'identité du gérant,
      compte de règlement)
- [ ] Récupérer identifiant de boutique et clés d'API (test **et** production)
- [ ] Déclarer l'URL de retour de paiement
- [ ] Confirmer les moyens de paiement réellement activés

**Aujourd'hui la commande s'enregistre et l'accès s'ouvre, mais aucun argent n'est encaissé.**

### Envoi d'e-mails — demande un accès DNS
- [ ] Ouvrir un compte (Brevo, Resend, Postmark, ou le SMTP de l'hébergeur)
- [ ] Authentifier le domaine `bigfive.ci` : SPF, DKIM, DMARC dans la zone DNS
- [ ] Récupérer la clé d'API et fixer l'adresse d'expédition
      (ex. `ne-pas-repondre@bigfive.ci`)

Débloque : réinitialisation de mot de passe, confirmation d'achat, envoi de l'attestation,
avertissement d'annulation de séance.
**Aujourd'hui, un apprenant qui oublie son mot de passe est bloqué** — le lien de réinitialisation
est écrit dans les journaux du serveur, à transmettre à la main.

### WhatsApp Business — à lancer tôt, même si ce n'est pas bloquant
- [ ] Ouvrir l'accès (Meta directement ou via 360dialog, Twilio, Vonage)
- [ ] Faire vérifier le numéro `+225 05 75 15 21 44`
- [ ] Soumettre les modèles de message — **Meta met 1 à 2 semaines à les valider**
- [ ] Récupérer identifiants du numéro et du compte, jeton permanent

### Zoom — coaching collectif
- [ ] Compte Zoom Pro minimum
- [ ] Créer une application « Meeting SDK » sur la place de marché Zoom
- [ ] Récupérer SDK Key et SDK Secret

En attendant : l'équipe crée la réunion à la main et transmet le lien.

### Google Analytics et Search Console
- [ ] Créer la propriété GA4 et le conteneur Google Tag Manager
- [ ] Vérifier le domaine dans la Search Console
- [ ] Saisir les identifiants dans **/admin/tracking** (l'écran est prêt)

Débloque les six lignes qui affichent « — » dans l'écran Performances.

---

## 4. À fournir en interne

- [ ] **Signature de la direction** en PNG fond transparent → déposer dans
      `public/images/brand/signature.png`. L'attestation l'affichera automatiquement ;
      en attendant, seul le trait de signature apparaît.
- [ ] **Visuels définitifs** — photos des formateurs, illustrations des modules et des articles,
      image de partage. Ce sont aujourd'hui des placeholders rayés.
- [ ] **Textes juridiques validés** — CGU, CGV, mentions légales, confidentialité, politique de
      cookies, et la case à cocher du récapitulatif d'achat.
- [ ] **Contenu des 16 modules** non encore rédigés (2 sont validés).
- [ ] **Changer le mot de passe des comptes de démonstration** avant toute ouverture publique.
      Il est aujourd'hui commun, connu, et écrit dans le README et sur l'écran de connexion.
- [ ] **Relever la présence** après chaque séance — *Calendrier des sessions*, colonne Présence.
      Sans ce relevé, les taux affichés aux formateurs restent vides.

---

## 5. Développement restant

- [ ] **Onglets détaillés de Performances** (Funnel, Ventes, Visites, Clients) — ils affichent des
      mesures d'audience, donc ils attendent Google Tag Manager. À faire une fois GA4 branché.
- [ ] **Pilote d'envoi réel** dans `server/utils/notifications.ts` (e-mail puis WhatsApp) dès que
      le fournisseur est choisi — tous les points d'appel sont en place, y compris le code de la
      connexion admin.
- [x] Double vérification à la connexion admin — `/admin/login`, code à six chiffres, 10 minutes,
      renvoi limité à un par minute. Envoi par **Supabase Auth** (`CODE_ADMIN_FOURNISSEUR=supabase-auth`).
- [ ] **Supabase Auth — SMTP personnalisé obligatoire.** Sur l'offre gratuite, Supabase refuse de
      modifier le gabarit Magic Link tant qu'aucun SMTP personnalisé n'est configuré (réponse 400
      « Email template modification is not available for free tier projects using the default
      email provider »). Tant que ce n'est pas fait, l'e-mail ne porte qu'un lien, pas de code :
      `CODE_ADMIN_FOURNISSEUR` reste sur `interne` (code dans la sortie du serveur). Dès qu'un
      compte SMTP existe (Brevo, Resend, Gmail avec mot de passe d'application…) : renseigner
      `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` et `SUPABASE_ACCESS_TOKEN` dans `.env`, lancer
      `npm run auth:configurer` (pose le SMTP, le gabarit en français avec `{{ .Token }}` et
      l'expiration à 10 min), puis passer `CODE_ADMIN_FOURNISSEUR=supabase-auth`.
- [x] Parcours de la planche E : coaching privé de bout en bout, paramètres et suppression du
      compte apprenant, candidature → compte formateur, éditeur d'article, onglet SEO du module,
      `/programmes`, motifs d'échec de paiement, écrans PWA (hors ligne, mise à jour, installation).

---

## Rappels utiles

```bash
npm run dev              # développement
npm run db:verifier      # rejoue migrations + seed sur un vrai PostgreSQL, sans Docker
npm run typecheck        # contrôle des types
npm run video:verifier   # contrôle la chaîne vidéo
npm run build            # build de production

# Après avoir modifié le contenu éditorial de server/data/db.ts :
npm run db:seed:generer && npm run db:sql
```

**Comptes de démonstration** — mot de passe commun `Masterclass2026!` :
`admin@bigfive.ci` (administrateur supérieur) · `editeur@bigfive.ci` (droits partiels) ·
`formateur@bigfive.ci` · `aya@example.ci` (apprenante, 2 modules et 1 attestation).

**Attention** : les variables d'environnement sont lues **à l'exécution** et priment sur ce qu'un
build aurait figé. Un serveur démarré avec un autre `SUPABASE_URL` parle bien à cette base-là.
