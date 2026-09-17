# Audit de fidélité maquettes ↔ application (planches A, B, C, D + parcours planche E)

## Contexte
Le dossier `maquettes/maquettes/` contient les quatre planches (A vitrine, B apprenant, C admin, D formateur). La planche E (diagramme des parcours) est référencée par les liens de navigation des maquettes mais le fichier `E - Diagramme des parcours.dc.html` est absent du dépôt ; ses six parcours sont décrits dans `README.md` (section « Parcours de la planche E »). L'utilisateur veut vérifier la fidélité 1:1 écran par écran et corriger les écarts.


## Décisions de l'utilisateur
- Périmètre : **tout**, fidélité 1:1, en lots successifs **0 (socle) → A → B → D → C**, un commit par lot.
- Infra lourde : **tout implémenter pour de vrai** (Zoom Meeting SDK Web, Google Agenda, upload/encodage vidéo admin, Phase, Annonce, % profil, suppression différée 14 j, personas), chacun avec un mode `simulation` quand les clés manquent (même patron que `NOTIFICATIONS_DRIVER=console` / `FEEXPAY_MODE`).
- Retirer tout ajout absent des maquettes (section blog accueil, tuiles compteurs apprenant, colonne Présence admin, encart Devenir formateur sur /formateurs, lien « Vérifier une attestation » footer) **sauf « Gérer mes cookies »** (RGPD).
- Mot de passe : garder 10 caractères, corriger les libellés.
- Identifiants Zoom / Google : à fournir par l'utilisateur ; en attendant, mode `simulation`.

## Avertissements du serveur de dev (logs fournis par l'utilisateur, à corriger en passant)
- `app/app.vue:5` : `useAsyncData('session', () => auth.rafraichir())` retourne `undefined` → warn NUXT_E3006, requête dupliquée côté client. Fix : `async () => { await auth.rafraichir(); return null }`.
- `[Icon] failed to load icon ph:list` / `ph:whatsapp-logo-fill` : les deux icônes existent bien dans `@iconify-json/ph` (vérifié). Cause probable : mode « server bundle local » de `@nuxt/icon` sans `icon.serverBundle.collections: ['ph']` dans `nuxt.config.ts` → à régler dans la config icon (ou `clientBundle`).
- `[h3] Please prefer using message ... statusMessage` : `createError({ statusMessage })` utilisé partout côté serveur (dont `server/utils/feexpay.ts`) → migrer vers `message` (grep `statusMessage:` dans `server/`). Cosmétique, hors périmètre fidélité, à faire si temps.

## Planche B — Espace apprenant : écarts relevés (agent)
Conforme : lecteur vidéo (watermark, HLS signé, script cliquable, vitesses, relevé 10 s), modale sujets collective, modale notation, mécanique de mise à jour PWA « prompt ».

Écarts, du plus visible au moins visible :
1. **Zoom non intégré** — `app/pages/mon-espace/session/[id].vue:45-72` placeholder. Maquette 11 : Meeting SDK Web (Component View desktop / Client View mobile), chat, participants, contrôles, lien de secours « Ouvrir dans l'application Zoom ».
2. **Pourcentage de complétion du profil inexistant** — seul `ficheCompletee` booléen (`shared/types/index.ts:185`). Maquette : bandeau « profil à 60 % » + barre + verrous « débloquez à 100 % » sur accueil, page module, sessions, tablette.
3. **Profil apprenant sans blocs personas** — `profil.vue` : manque Ville, select Niveau, bloc Entrepreneur (entreprise, stade, taille équipe, canaux, présence en ligne, budget, défi), bloc Social Média (audience, outils, clients). Champ Pays présent alors que la maquette le retire. Pas de mode Modifier/Enregistrer verrouillé. WhatsApp doit migrer vers Paramètres.
4. **Suppression de compte** — `parametres.vue:54-69, 135-167` : suppression immédiate. Maquette 12 : 4 écrans (récap chiffré, mot de passe + case 14 jours, « Suppression programmée » J-14 / rappel J-3, « Bon retour » réactivation à la reconnexion). Wording des boutons.
5. **Accueil** `mon-espace/index.vue` : manque bandeau profil, encart Coaching privé, Historique d'achats, lien Communauté WhatsApp, badges En cours/Complété, compteur chapitres `2/3`, formateur + prochaine session sur la carte, `J-8` et bouton « Rejoindre — actif le jour J », encart verrou. 3 tuiles compteurs en trop. Titre « Bonjour Awa, reprenez où vous vous étiez arrêtée ».
6. **Page module** `mon-espace/module/[slug].vue` : surtitre `PROGRAMME · THÉMATIQUE · MODULE 05`, progression en chapitres, vidéo de bienvenue « ne compte pas », liste chapitres avec état/reprise et boutons Revoir/Reprendre, carte Coaching session du module, texte de condition du certificat, bloc Ressources (PDF/liens — type absent du modèle). Retirer « Marquer comme terminé » et sections « Pourquoi ce module ? / Livrable ».
7. **Sessions** `mon-espace/sessions.vue` : titre « Vos sessions de coaching », pastille date `10 / SEPT`, libellé « — session mensuelle », sessions passées « Vous avez participé ✓ », note rappels J-1/H-1, 6 états (🔒 Complétez votre profil, Réserver, ✓ Inscrit · rappel prévu, Rejoindre à H-15, Complet — liste d'attente, Reportée — nouvelle date). « Noter le formateur » seulement après la session.
8. **Certificats** `mon-espace/certificats.vue` : 3 états (délivré / ⏳ en progression / 🔒 non commencé), bouton « Télécharger PDF », note de conditions ; écran 05 de validation (vérif prénom/nom + récap) avant génération.
9. **Coaching privé** `mon-espace/coaching-prive.vue`, `app/utils/coachingPrive.ts` : statuts maquette (Envoyée, En étude, Créneau proposé, Confirmée (payée), Planifiée/Réalisée, Refusée/expirée), actions « Accepter et payer » / « Proposer un autre créneau », rappel « 2 h (100 000 FCFA) · date », tableau Historique daté, sélecteur 1/2/3 h, monter la modale `ModaleSujets` variante `prive` au clic « Rejoindre ».
10. **PWA mobile** : barre d'onglets basse 4 items dans `app/layouts/espace.vue` (< lg), header espace dédié (logo + pastille initiales + Déconnexion, nav « Mes modules · Coaching collectif · Coaching privé · Mes certificats »), `BandeauPwa.vue` : carte d'installation plein écran + tutoriel Android/iPhone, toast « Nouvelle version disponible », pas de mise à jour pendant lecture vidéo ; `hors-ligne.vue` texte maquette.
11. **Paramètres** `mon-espace/parametres.vue` : lignes compactes valeur + bouton Modifier/Changer, WhatsApp ici, date dernière modification mdp, 3 interrupteurs (toggles) maquette, mention 14 jours.
12. **Lecteur** : barre de contrôles custom sur la vidéo (temps, vitesse, qualité, plein écran) au lieu des contrôles natifs — optionnel.

## Planche A — Site vitrine : écarts relevés (agent)
Conforme : identité (jetons `app/assets/css/main.css`), cookies (10) intégral, annexe SEO/JSON-LD/carrousel (14), FAQ programme et contact au mot près, bloc achat états 1/2/5, confirmation paiement, page formateurs, message succès devenir-formateur.

Écarts :
1. **Bloc d'achat 03c** `app/pages/modules/[slug].vue:250-261` : état 3 « Bientôt disponible » (badge, « Prochainement », bouton inactif) fusionné avec état 4 « À venir » ; tester `statut === 'en-preparation'` vs `'brouillon'`. État 4 : « Être prévenu du lancement » doit collecter email/WhatsApp (pas lien WhatsApp).
2. **6 échecs de paiement 04c** `app/utils/paiement.ts`, `shared/types/index.ts:260-266`, `server/utils/feexpay.ts` (codeEchecDepuisMotif) : la liste maquette = solde insuffisant, validation expirée, refus opérateur, carte refusée, interruption réseau (→ « Vérification en cours » puis email), double paiement détecté (→ « Achat déjà confirmé » + accès). Ajouter `doublon` et `interruption-reseau`, renommer wording `reseau-operateur` en refus opérateur. Afficher la référence FP-… dans le bloc d'erreur (`achat/paiement.vue:211-218`). Avertissement « ⚠ Ne fermez pas cette page avant la confirmation » (`paiement.vue:253`).
3. **Pages légales 09** `app/components/legal/PageLegale.vue` : sommaire latéral « Documents légaux » (5 liens) en 2 colonnes ; `cgv.vue` articles numérotés (« Article 2 — Vente ferme et définitive »).
4. **Connexion 04b** `connexion.vue` : message d'erreur avec compteur « Il vous reste N tentatives avant verrouillage temporaire (15 min) » (vérifier ce que renvoie `server/api/auth/*`), case « Rester connecté », lien « Créez-en un ». `mot-de-passe-oublie.vue` : « Pensez à vérifier vos spams ». `reinitialiser-mot-de-passe.vue` : label « Confirmez le mot de passe », CTA « Enregistrer et me connecter », message « ✓ Mot de passe mis à jour… » avant redirection.
5. **Tunnel étape 1** `achat/compte.vue` : ordre Nom/Prénom, champ « Confirmez le mot de passe », select Pays (CI, Bénin, Burkina, Sénégal, Autre), préfixe +225, aides sous WhatsApp/Pays, « Déjà inscrit ? Connectez-vous ». Seuil mdp : maquette dit 8, serveur 10 → garder 10, décision à confirmer.
6. **Tunnel étape 2** `achat/recapitulatif.vue` : ligne Module dans le tableau, « Durée d'accès », « Total TTC », case CGV wording exact (« contenu numérique à accès immédiat », « ferme et définitive »), lien « ← Revenir en arrière ou annuler ». `EtapesAchat.vue` : libellés en capitales.
7. **Fiche module 03** : section « Points forts » (champ `pointsForts` à ajouter au type `Module`, mapper, seed, éditeur admin), surtitre « Votre formateur », Acquis/Livrable en 2 H2 pleine largeur 27px ; retirer « Dans la même thématique ». Barre d'achat collante mobile (prix + Acheter).
8. **Blog 12/13** `blog/index.vue`, `ArticleCarte.vue`, `blog/[slug].vue` : filtre « Tous les articles », chips + CTA « Lire l'article » à la une, lien « Lire l'article → » sur cartes, pagination ← 1 2 3 →, retirer « Articles récents », paragraphe CTA ; article : encart « Modules liés à cet article », CTA final « Envie d'approfondir… », maille catégorie dans le fil d'Ariane.
9. **Responsive 07/11** : `TheHeader.vue:31` « Mon espace » visible dès `md:` ; `HeroCarousel.vue:81-88` deux CTA côte à côte sous `lg` ; cartes programmes tablette courtes (`index.vue:86-113`) ; `programmes/[slug].vue:117` H1 Jost 300 / 56px.
10. **Contact 08** `contact.vue` : FAQ à gauche / formulaire à droite, erreur par champ (email rouge + « Adresse email incomplète — vérifiez le format. »), « (facultatif) », placeholder « Ex. FP-2608-14352 », succès « ✓ Message envoyé. … sous 24 h ouvrées — un accusé vient de vous être adressé. »
11. **Accueil 01** : retirer section blog en bas de `index.vue:210-228` (ou garder : décision). Footer : liens ajoutés (Vérifier une attestation, Gérer mes cookies) à garder (RGPD).
12. **Devenir formateur 06** : Portfolio et LinkedIn obligatoires, ordre des champs (WhatsApp en 1er), pattern.png en fond ; retirer encart « Devenir formateur » de `/formateurs`.

## Planche C — Back-office : écarts relevés (agent)
Conforme : modale annulation session, candidatures (C-12), écran verrouillé Transactions (C-14), répartition des échecs (C-18f), tracking verrouillé + mot de passe (C-19), panneau Référencement et partage (C-24), sidebar tablette en icônes (C-17).

Écarts :
1. **Performances C-18** `app/pages/admin/performances.vue` : `onglet` écrit mais jamais lu → toutes sections affichées ; 5e onglet « Funnel & conversion » absent ; filtres Programme/Module/Pays/Appareil/Source + période ; contenus 18b/c/d/e (funnel 4 étapes, ventes par module/programme/pays + moyens de paiement, visites quotidiennes/pays/navigateurs/sources, clients nouveaux/récurrents/meilleurs/pays/programme, rétention) ; « Top module », liens vers onglets.
2. **Prévisualisation C-10** `admin/module/[id].vue:217-223` : bascule Desktop/Mobile 390 + bandeau « PRÉVISUALISATION — non publié » (iframe vers la page publique avec `?apercu=…`).
3. **Hiérarchie C-02** `admin/contenus.vue` : niveau Phase (modèle + migration), boutons « + Nouveau programme / phase / thématique », badge statut thématique réel (pas « Publiée » en dur), « ＋ Ajouter une thématique », boutons Modifier · Prévisualiser · Historique, liste des chapitres « Script ✓ », glisser-déposer.
4. **Statut « Annonce »/« Bientôt disponible » C-02B** : nouveau statut module + date de lancement + collecte « Être prévenu » (lié planche A 03c état 3/4 et C-24 statut « À venir »). Fiche commerciale : 9 blocs numérotés (Bloc 7 Points forts, Bloc 8 Votre formateur, Bloc 9 Informations pratiques), « Programme du module — synchronisé », bouton « Enregistrer et publier », libellés statut en clair.
5. **Éditeur module C-09** : onglets « Informations · Chapitres (3) · Ressources (2) · Fiche commerciale · Offre & prix », fil d'Ariane, « Brouillon — sauvegardé il y a 12 s », « Marquer "Prêt" » en en-tête, upload vidéo + encodage % + script SRT/VTT + watermark + checklist avant « Prêt » (lourd : dépend du pipeline `scripts/transcoder-video.mjs`).
6. **CMS C-15** `admin/cms.vue:166-195` : formulaires par type de bloc au lieu du JSON brut ; carrousel bannière (slides, ajout, ordre, 6 s) ; Prévisualiser par bloc ; historique restaurable ; annonce programmable (dates).
7. **Formateurs C-11 / C-07b** `admin/formateurs.vue` : bouton « Supprimer définitivement » sans `@click` (l.186-192) → **bug** ; action « Modifier » ; réordonnancement ⋮⋮ ; modale « Activer le coaching privé pour X ? » (4 puces) ; libellés « Repasser simple » / « Activer le coaching privé → » ; colonne « Accès ».
8. **Apprenants C-04 / C-13** `admin/apprenants.vue` : « + Ajouter un apprenant » (modale Nom/Email/WhatsApp + case attribuer accès), révocation d'accès 2 étapes + motif + notification, export CSV, filtres pastilles, colonne Coaching, progression `2/3`, date d'inscription, fiche : origine des accès, coaching privé, historique.
9. **Export CSV** : C-04, C-14 (+ filtre mois), C-21, C-23 (utilitaire commun `app/utils/csv.ts`).
10. **Paramètres C-20** `admin/parametres.vue` : 4 volets en onglets (Accès · Tracking 🔒 · Référencement · Mon profil), profil éditable (photo, nom, email, WhatsApp), check-list mot de passe ; retirer « Répartition et frais » ou le déplacer.
11. **Référencement C-23** `admin/referencement.vue` : titre « Référencement (SEO) », recherche, onglets avec compteurs + « À compléter », colonnes Type/Meta, Exporter, bloc « État technique » (sitemap, robots, Search Console, redirections, 404), encarts pédagogiques ; C-24 : sélecteur de page, historique du slug, statuts Brouillon/Publié/À venir.
12. **Sessions C-03** `admin/sessions.vue` : filtres Thématique/Formateur, actions Modifier/Reporter, statut « Presque pleine », formulaire (titre, durée, capacité, ouverture salle 15/10/5 min, enregistrement, modules éligibles auto).
13. **Coaching privé C-05/C-06** `admin/coaching-prive.vue` : choix heures 1/2/3 h + montant, « Générer le lien de session » (+ agenda Google : hors périmètre, à simuler), mention rappel 48 h, filtres stats formateurs, colonne « 4 modules · 2 sessions ».
14. **Accès C-07/07b** `admin/acces.vue` : bloc « Trois rôles distincts », colonnes Compte/Rôle/Périmètre/Actions, formateurs listés, champ Nom unique, modale révocation ; vérifier 18 sections + notes.
15. **Connexion C-08** `admin/login.vue` : « ESPACE ADMINISTRATION », « ÉTAPE 2 / 2 », « Vérifier et entrer », « Renvoyer le code (0:42) », 6 cases.
16. **Vue d'ensemble C-01** `admin/index.vue` : filtres mois/programme, bandeau trafic du jour, « Réf. FeexPay », en-tête latéral rôle. **Journal C-16** : filtres admin/type/objet, colonnes version/diff/IP/notification. **Blog C-22** : onglets Tous/Publiés/Brouillons + filtres, colonne Indexation, onglet « Publication », « Prévisualiser ». **Revenus C-21** : filtres, tableau par source. **Tracking C-19** : badges état + « Vérifier l'installation » / « Événement test ».
17. **Layout admin** `app/layouts/admin.vue:77,110` : aucune navigation sous 768 px → menu mobile.

## Planche D — Espace formateur : écarts relevés (agent)
Conforme : D-02 Modifier/Enregistrer, D-03 colonnes/statuts, D-06 cartes et tableau revenus, verrou coaching privé fonctionnel.

Écarts :
1. **Fiche apprenant lecture seule D-04** `formateur/sessions.vue` : lien « N sujets → », liste des inscrits, fiche persona (progression, sujet, coaching privé), « — modules 04, 05, 06 », notes « 4,9 ★ (17) ». Nouvelle page `formateur/apprenant/[id].vue` + API.
2. **Navigation mobile** `app/layouts/formateur.vue:20` : barre d'onglets basse (Accueil · Modules · Sessions · Privé · Revenus) sous `lg`, carte mobile « VOTRE RÉMUNÉRATION » + relevé PDF.
3. **Vue d'ensemble D-01** `formateur/index.vue` : bloc « À traiter » (Coaching privé N · Sujets à lire N · Nouvelles notes N), filtres mois/modules, titres « Votre prochaine coaching session », « Sujets soumis pour la session du JJ/MM » + « Les N réponses → », « moyenne des 6 dernières », date d'origine des notes ; pastille compteur « Coaching privé 2 » dans la nav ; retirer « Mon profil » de la sidebar (accès via avatar).
4. **Filtres** période/module sur D-03 `formateur/modules.vue` (+ ligne cliquable → détail) et D-06 `formateur/revenus.vue`.
5. **Relevé PDF D-06** : bouton « Télécharger le relevé PDF » (génération à partir de la page certificat existante ou impression).
6. **Profil D-02** `formateur/profil.vue` : « Changer la photo », Email professionnel, WhatsApp, badge de rôle.
7. **Coaching privé D-05** `formateur/coaching-prive.vue` : « Voir la fiche apprenant », mention Google Agenda, wording verrou « Coaching privé non activé » + explication 50 000 FCFA/h, « Demander l'activation à l'équipe ».

---

# Plan d'implémentation (lots 0 → A → B → D → C)

Conventions : types métier `shared/types/index.ts` ↔ lignes SQL `server/database/types.ts` ↔ `server/database/mappers.ts` ; une migration par lot dans `supabase/migrations/`, puis `npm run db:sql` (régénère `supabase/en-ligne/`), `npm run db:seed:generer` si `server/data/db.ts` change, `ATTENDUS` de `scripts/verifier-migrations.mjs` mis à jour. Toute écriture module/article/bloc passe par `enregistrerVersion()` (`server/database/backoffice.ts:292`) : inclure les nouvelles colonnes de `modules` dans `majModule`. Une valeur d'enum ajoutée n'est pas utilisable dans la même migration.

## Lot 0 — Socle transverse
Commit « Socle transverse : Phase, Annonce, profil, suppression différée, outils partagés ».

**Migration `20260915120000_socle_transverse.sql`**
| Objet | Colonnes | Sert |
|---|---|---|
| `statut_module` + `'annonce'` | — | A-03c état 3, C-02B, C-24 |
| `modules` | `date_lancement date`, `prix_masque bool`, `points_forts text[]`, `video_intro_cle text` | A-03, B-02, C-09 |
| `alertes_lancement` | `id, module_id, email, whatsapp, cree_le`, unique `(module_id, lower(email))` | A-03c état 4, C-02B |
| `phases` | `id text pk, programme, numero, nom, statut statut_publication, date_ouverture, cree_le`, unique `(programme, numero)` | C-02 |
| `thematiques` | `phase_id → phases`, `statut statut_publication` ; seed : Phase 1 par programme | C-02 |
| `personas` | `ville, niveau, entreprise, stade, taille_equipe, canaux, presence_en_ligne, budget, defi, audience, outils, clients` | B-04, D-04, C-13 |
| `utilisateurs` | `suppression_prevue_le`, `mot_de_passe_maj_le`, `derniere_reactivation_le` | B-11/12 |
| `journal` | `type, objet, ip, diff jsonb, notification` | C-16 |
| `acces` | `origine ('achat','attribution')`, `revoque_le`, `motif_revocation` | C-04/13, B-01 |
| `liste_attente_sessions` | `(session_id, utilisateur_id, inscrit_le)` | B-08 |
| `sessions_coaching` | `titre, ouverture_salle_minutes default 15, enregistrement bool, reportee_de date` | B-08, C-03 |

Puis types SQL/métier/mappers, `server/data/db.ts` (phases, `pointsForts`), seed régénéré, `ATTENDUS.phases = 2`.

**Utilitaires partagés**
- `shared/utils/profil.ts` : `calculerCompletionProfil(utilisateur, persona, programme)` → `{ pourcentage, champsManquants }` ; `majPersona` (`server/database/comptes.ts:200`) pose `fiche_completee = pourcentage === 100` (garde `reserver_place_session` cohérent). Exposé par `auth/moi.get.ts`, `mon-espace/compte/index.get.ts`, `mon-espace/sessions/index.get.ts`.
- `app/utils/csv.ts` : `exporterCsv(nom, colonnes, lignes)` BOM UTF-8, `;`. Sert C-04, C-14, C-21, C-23.
- `app/components/layout/BarreOngletsMobile.vue` (`fixed bottom-0 lg:hidden`, safe-area) — layouts espace + formateur.
- `app/components/layout/MenuMobileAdmin.vue` (tiroir `md:hidden`) — layout admin.
- `app/components/ui/Onglets.vue` (tablist, compteurs) — C-09, C-18, C-20, C-22, C-23. `app/components/ui/Interrupteur.vue` — B-11, C-03, C-19.
- `server/utils/journal.ts` : `enregistrerJournal(auteur, action, cible, extras?)`.

**Suppression différée + réactivation (modèle/API ; écrans en B)**
- `comptes.ts` : `programmerSuppression`, `annulerSuppression`, `listerSuppressionsEchues`, `listerSuppressionsJ3`.
- `mon-espace/compte/suppression.post.ts` programme ; `suppression.delete.ts` annule ; `GET compte/recapitulatif` (modules, certificats, sessions chiffrés).
- `auth/connexion.post.ts` : `suppressionPrevueLe` futur → session ouverte + `reactivable: true` ; `connexion.vue` → `/mon-espace?bon-retour=1`.
- Purge + rappel J-3 : tâche Nitro `server/tasks/comptes/purger.ts` (`nitro.experimental.tasks`, cron `0 3 * * *`) + `POST /api/taches/purger` protégé par `TACHES_CLE` (Vercel). Modèles `notifications.ts` : `suppression-programmee`, `suppression-rappel`, `compte-reactive`.

**Correctifs dev (même lot)** : `app/app.vue:5` retourne `null` ; `nuxt.config.ts` `icon.serverBundle.collections: ['ph']` ; `statusMessage → message` (144 sites `server/`, vérifier `app/` lit `e.data?.statusMessage`) en commit séparé.

## Lot A — Site vitrine
Commit « Planche A : fidélité 1:1 ».
- **Migration `20260916120000_vitrine.sql`** : `code_echec_paiement` + `'doublon'`, `'interruption-reseau'` ; `candidatures_formateurs.linkedin text`.
- **API** : `modules/[slug].get.ts` expose `pointsForts/dateLancement/prixMasque`, module `annonce` visible mais hors sitemap (`__sitemap__/urls.get.ts`) et non indexable ; `alertes-lancement.post.ts` (409 doublon) ; `feexpay.ts` `codeEchecDepuisMotif` → `doublon` (réf. déjà confirmée → « Achat déjà confirmé » + accès), `interruption-reseau` (commande `verification` + e-mail `paiement-verification`) ; `app/utils/paiement.ts` libellés maquette ; `auth/connexion.post.ts` renvoie `tentativesRestantes` (5 − échecs/30 min, `compterEchecsRecents`) + « Rester connecté » (`ouvrirSession(…, { longue: true })`, 30 j dans `session.ts`) ; `contact.post.ts` erreurs par champ + accusé `contact-accuse` ; `candidatures.post.ts` portfolio/linkedin obligatoires.
- **Pages, dans l'ordre** : `modules/[slug].vue` (4 états du bloc, Points forts, « Votre formateur », Acquis/Livrable H2, retrait « même thématique », barre collante mobile) → `achat/paiement.vue`, `compte.vue`, `recapitulatif.vue`, `ui/EtapesAchat.vue` → `legal/PageLegale.vue` + `cgv.vue` → `connexion.vue`, `mot-de-passe-oublie.vue`, `reinitialiser-mot-de-passe.vue`, `compte/FormulaireMotDePasse.vue` → blog (`articles/index.get.ts` `page/parPage=9`, `blog/index.vue`, `ArticleCarte.vue`, `blog/[slug].vue`) → `contact.vue`, `devenir-formateur.vue`, `formateurs/index.vue`, `index.vue` (retrait blog, cartes tablette) → responsive `TheHeader.vue:31` (`md:`), `HeroCarousel.vue:81-88`, `programmes/[slug].vue:117`.
- Avant : grep `'brouillon'` / `'en-preparation'` dans `server/` et `app/` (filtres publics à adapter pour `annonce`).

## Lot B — Espace apprenant
Commit « Planche B : fidélité 1:1, Zoom, suppression différée, PWA ».
- **Migration `20260917120000_apprenant.sql`** : `statut_coaching_prive` + `'en-etude'`, `'creneau-propose'`, `'expiree'` ; `sessions_coaching` `zoom_reunion_id, zoom_mot_de_passe, zoom_lien_participation, zoom_lien_hote` ; `demandes_coaching_prive` `zoom_reunion_id, evenement_agenda_id, montant_fcfa` ; `commandes.demande_coaching_id` (nullable — « Accepter et payer » via tunnel FeexPay ; vérifier `enregistrerCommande` `commerce.ts:166` accepte une commande sans module) ; `certificats.prenom_nom_confirme_le`.
- **Zoom** : `npm i @zoom/meetingsdk` (import dynamique client). Env : `ZOOM_MODE=simulation|live`, `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` (S2S OAuth), `ZOOM_SDK_CLIENT_ID`, `ZOOM_SDK_CLIENT_SECRET` ; public `zoomActif`. `server/utils/zoom.ts` : `signatureSdk` (JWT HS256 `node:crypto`), `jetonServeur` (cache), `creerReunion/modifierReunion/supprimerReunion` (`/v2/users/me/meetings`, `Africa/Abidjan`, waiting room) ; simulation → id fictif. `server/api/zoom/signature.post.ts` (vérifie inscription/hôte, fenêtre H-15 → fin+30, sinon 425). Hooks : `admin/sessions.post/patch` (créer/reporter/annuler), `admin/coaching-prive.patch` `planifier`. Client `app/composables/useZoom.ts` (Component View ≥1024 px, Client View sinon) ; `mon-espace/session/[id].vue` remplace le placeholder ; page réutilisée côté formateur (`/formateur/session/[id]`, rôle hôte). CSP permissive sur `/mon-espace/session/`.
- **API** : `mon-espace/index.get.ts` (chapitres vus/total via `visionnages`, prochaine session, J-n, `completionProfil`, dernière commande, coaching privé) ; `module/[slug].get.ts` (ressources, vidéo intro, état chapitres + reprise, session du module) ; `sessions/index.get.ts` 6 états + `liste-attente.post.ts` ; `certificats/index.post.ts` exige prénom/nom ; `coaching-prive/[id]/accepter.post.ts`, `proposer-creneau.post.ts` ; `coachingPrive.ts` libellés ; `profil.put.ts` personas ; `mot-de-passe.put.ts` pose `mot_de_passe_maj_le`.
- **Pages** : `layouts/espace.vue` (header dédié + `BarreOngletsMobile`, retrait `LayoutTheHeader`) → `espace/BandeauProfil.vue`, `VerrouProfil.vue` → `index.vue`, `module/[slug].vue`, `sessions.vue`, `certificats.vue` (+ modale validation), `coaching-prive.vue` (1/2/3 h, `ModaleSujets` `prive`, Historique), `profil.vue`, `parametres.vue` (+ `ModaleSuppressionCompte.vue`, 4 écrans), `hors-ligne.vue` → `BandeauPwa.vue` (carte plein écran + tutoriel Android/iPhone, « Nouvelle version disponible », pas de prompt sur lecture/session) → lecteur contrôles custom (dernier, optionnel).

## Lot D — Espace formateur
Commit « Planche D : fidélité 1:1 ».
- **Migration `20260918120000_formateur.sql`** : `formateurs.email_pro, whatsapp` ; `sujets_sessions.lu_le`.
- **Google Agenda** `server/utils/googleAgenda.ts` : compte de service, JWT RS256 (`crypto.sign`), `calendar.events` sur `GOOGLE_AGENDA_ID` partagé en écriture, rappels 24 h + 1 h ; `GOOGLE_AGENDA_MODE=simulation`. Env : `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_CLE_PRIVEE` (base64 PEM). Aucune dépendance npm.
- **API** : `formateur/apprenant/[id].get.ts` (périmètre : inscrit à une de ses sessions ou possède un de ses modules ; sans e-mail/WhatsApp) ; `tableau-bord.get.ts` (À traiter, filtres mois/module, moyenne 6 dernières) ; `modules.get`, `revenus.get` filtres (`surPeriode` de `server/utils/indicateurs.ts`) ; `sujets/[sessionId].get.ts` marque lu ; `profil.put.ts` photo/e-mail/WhatsApp (+ `photo.post.ts`) ; `demande-activation.post.ts`.
- **Pages** : `layouts/formateur.vue` (barre d'onglets, retrait « Mon profil », pastille compteur) → `index.vue`, `sessions.vue` (+ `formateur/apprenant/[id].vue`), `modules.vue` (+ `formateur/module/[id].vue`), `revenus.vue` (+ `formateur/releve/[mois].vue` imprimable A4 comme `certificats/[numero].vue`), `coaching-prive.vue`, `profil.vue`.

## Lot C — Back-office
Commit « Planche C : fidélité 1:1, éditeur vidéo, performances ».
- **Migration `20260919120000_back_office_2.sql`** : `travaux_video (id, chapitre_id, cle, source_cle, nom_fichier, octets, statut check ('televerse','en-file','encodage','termine','echec'), progression, duree_secondes, erreur, cree_le, maj_le)` ; `chapitres.script_importe_le, format_script` ; `modules.pret, pret_le, watermark` ; `utilisateurs.photo` ; `formateurs.position` ; `erreurs_404 (chemin, vues, derniere_le)` ; `section_admin` + valeur si la maquette en compte 18.
- **Upload/encodage vidéo** (ffmpeg absent sur Vercel ; R2 + Worker + scripts existent) : (1) Worker `infra/worker-video` : multipart R2 `POST /televersements`, `PUT /televersements/:cle/:uploadId/:partie` (8 Mo, reprise), `POST …/terminer`, autorisé par HMAC `signer()` de `server/utils/video.ts` (même `VIDEO_SIGNING_SECRET`) ; (2) Nuxt `admin/video/televersement.post.ts`, `…/terminer.post.ts`, `GET admin/video/travaux` (polling 5 s) ; composable `useTeleversementVideo.ts` (slices, ×3 parallèle, reprise localStorage, % via XHR) ; (3) `scripts/transcoder-video.mjs` exporte `transcoder(source, cle, { surProgression })` ; nouveau `scripts/encoder-file-attente.mjs` (`npm run video:file-attente`, poste avec ffmpeg + wrangler : boucle `travaux_video en-file` → télécharge → transcode → publie → `chapitres.video_cle`) ; (4) `VIDEO_UPLOAD_MODE=local` : `televersement-local.post.ts` multipart → `medias/sources/`, spawn du script si ffmpeg, sinon progression simulée ; (5) `server/utils/soustitres.ts` SRT/VTT → `LigneScript[]`, `POST admin/chapitres/[id]/script` ; (6) checklist dans `admin/module/[id].get.ts`, `POST …/pret` (422 si incomplet), « Enregistrer et publier » conditionné à `pret`.
- **Prévisualisation C-10** : `GET admin/module/[id]/apercu` → jeton HMAC 1 h ; `modules/[slug].get.ts?apercu=` renvoie brouillon/annonce + `apercu: true` ; page publique affiche bandeau « PRÉVISUALISATION — non publié » + noindex ; `admin/Previsualisation.vue` iframe Desktop / Mobile 390. Réutilisé par le CMS pour `/`.
- **API, ordre** : contenus/phases/thematiques/programmes → `modules.put` (annonce, lancement, prixMasque, pointsForts, pret) + `alertes-lancement.get` → CMS typé par bloc (slides, annonce programmée) + historique `listerVersions` → `formateurs.post` (modifier, supprimer — corrige le bouton inerte, réordonner) → `apprenants.post` (création + attribution), `acces/revoquer.post` (2 étapes, motif, notification, journal), `apprenants.get` enrichi → `parametres` profil + mdp check-list → `referencement.get` (compteurs, À compléter, état technique, 404 via `middleware/redirections.ts`) → `sessions` (filtres, titre, ouverture salle, enregistrement, « Presque pleine » ≥ 80 %, modifier/reporter) → `coaching-prive.patch` (heures × 50 000, `generer-lien` Zoom + Agenda, rappel 48 h) → `acces` (formateurs listés, 18 sections) → `auth/admin/renvoyer-code` renvoie `prochainRenvoiDans` → `vue-ensemble`, `journal` (filtres), `articles` (indexation, onglets), `revenus` (par source), `tracking` (état + test) → `performances.get` 5 onglets + filtres (`indicateurs.ts`).
- **Pages, ordre** : `layouts/admin.vue` (menu mobile, rôle) → `contenus.vue` → `module/[id].vue` (onglets maquette, fil d'Ariane, autosave 3 s « sauvegardé il y a N s », Marquer « Prêt », upload + % + script + watermark + checklist, fiche 9 blocs, Annonce + lancement + compteur, prévisualisation) → `cms.vue` → `formateurs.vue` → `apprenants.vue` → `parametres.vue` (4 onglets) → `referencement.vue` → `sessions.vue` → `coaching-prive.vue` → `acces.vue` → `login.vue` → `index.vue`, `historique.vue`, `blog.vue`, `revenus.vue`, `tracking.vue`, `transactions.vue` → `performances.vue` (lire `onglet`).

## Dépendances et env
- npm : `@zoom/meetingsdk` uniquement (`vite.optimizeDeps.exclude` si besoin). JWT, multipart, Google : `node:crypto` + `fetch`.
- `.env.example` + README : `ZOOM_*` (6), `GOOGLE_AGENDA_MODE`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_CLE_PRIVEE`, `GOOGLE_AGENDA_ID`, `VIDEO_UPLOAD_MODE=local|r2`, `TACHES_CLE`.

## Vérification
Commun à chaque lot : `npm run typecheck`, `npm run db:verifier` (ATTENDUS + assertions nouvelles), `npm run db:sql` + relecture `git diff supabase/en-ligne`, `npm run dev` en modes simulation, preview navigateur desktop / 768 / 390 (`resize_window`), lecture console.
- Lot 0 : `/api/auth/moi` renvoie `completionProfil` ; programmer suppression → reconnexion « Bon retour » → annulation ; `POST /api/taches/purger` avec clé.
- Lot A : `/modules/<slug>` en `disponible` / `en-preparation` / `annonce` (SQL), « Être prévenu » 409 doublon ; tunnel `FEEXPAY_MODE=simulation` avec les 6 échecs ; 5 échecs connexion → compteur puis verrou ; blog pagination ; header/hero à 768/1024 ; `curl /sitemap.xml` sans module `annonce`.
- Lot B : parcours apprenant desktop + 390 ; profil < 100 % → verrous, 100 % → Réserver ; session `ZOOM_MODE=simulation` (refus hors H-15) puis `live` avec réunion test ; certificat écran 05 ; « Accepter et payer » ; PWA `npm run build && node .output/server/index.mjs`, pas de prompt pendant lecture.
- Lot D : formateur : À traiter, fiche apprenant (403 hors périmètre), filtres, relevé PDF, Agenda simulation puis live.
- Lot C : admin + éditeur (droits masqués) ; phases/thématiques ; téléversement MP4 court en `local` (ffmpeg → % réel), SRT, checklist, Prêt, publier, prévisualisation ; `r2` : `npm run video:file-attente` + `npx wrangler deploy` ; CMS ; apprenants ajout/révocation/CSV (Excel accents) ; performances 5 onglets ; menu mobile 375 ; login compteur renvoi.

## Risques
- Enum `annonce` : filtres publics testent `=== 'disponible'` ou `!== 'brouillon'` → grep avant lot A.
- `fiche_completee` reste la source de `reserver_place_session` : recalcul dans `majPersona` obligatoire.
- Zoom Client View injecte son DOM plein page + CDN Zoom : `layout: false`, CSP ; Component View exige `zoomAppRoot` monté avant `init`.
- Vercel : pas de ffmpeg ni cron natif → file d'attente hors ligne + cron externe ; documenter.
- Commande sans module pour « Accepter et payer » : vérifier `enregistrerCommande` / `cloreTransactionsCommande`.
- `statusMessage → message` : commit séparé, revert facile.
