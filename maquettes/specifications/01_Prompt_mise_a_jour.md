# Prompt de mise à jour — Maquette E-Masterclass Big Five

## Mission

Mettre à jour la maquette HTML existante du site vitrine E-Masterclass Big Five à partir des décisions ci-dessous. Travailler en continuité de la direction artistique actuelle : ne pas refaire l’interface, ne pas inventer de nouvelles fonctionnalités et ne pas modifier les parcours déjà validés.

## Règles globales

- Utiliser partout la dénomination exacte **E-Masterclass Big Five**.
- Conserver le header blanc et garantir la lisibilité du logo officiel.
- Conserver la palette actuelle des programmes : violet pour Social Média, bleu pour Entrepreneurs.
- Conserver les polices libres déjà retenues dans la maquette.
- Maintenir le bouton permettant de naviguer entre toutes les planches/pages de la maquette, mais le rendre plus discret.
- Reporter toutes les corrections sur les versions desktop, tablette et mobile/PWA.
- Préserver un seul H1 par page et une hiérarchie visuelle claire entre programme, thématique et module.
- Retirer de l’interface publique toutes les annotations techniques destinées au développeur.
- Ne jamais présenter les programmes comme des parcours complets obligatoires : les modules sont indépendants, achetables à l’unité et suivis selon les besoins.
- Conserver le prix de **10 000 FCFA TTC par module**, l’accès à vie, les coachings collectifs et les certificats de participation.

---

# 1. Page d’accueil

## Hero en carrousel

Conserver un hero en deux slides. Les éléments suivants changent ensemble : sous-titre, seconde partie du H1, description, CTA, couleur et visuel. La première partie du H1 reste fixe.

### Slide Social Média

- Sous-titre : **PROGRAMME SOCIAL MÉDIA**
- H1 : **Montez en compétences. Restez dans la course.**
- Description : **Choisissez parmi 9 modules de 60 minutes pour renforcer des compétences précises en stratégie, contenu et plateformes Social Media. Accès à vie et sessions de coaching collectif.**
- CTA : **Découvrir le programme Social Média**

### Slide Entrepreneurs

- Sous-titre : **PROGRAMME ENTREPRENEURS**
- H1 : **Montez en compétences. Soyez à jour.**
- Description : **Choisissez parmi 9 modules de 60 minutes pour renforcer les compétences utiles au développement de votre activité : valider une idée, fixer vos prix, vendre et gagner en visibilité.**
- CTA : **Découvrir le programme Entrepreneurs**

### Comportement

- Un seul élément HTML H1, même lorsque sa seconde partie varie.
- La première partie « Montez en compétences. » reste fixe.
- Le carrousel change le programme, la seconde partie du H1, la description, le CTA et le visuel.
- Les CTA conduisent vers les pages programmes et non directement vers les modules.

## Bandeau sous le hero

- **18 modules disponibles**
- **10 000 FCFA TTC par module**
- **Accès à vie après l’achat**

## Section Programmes

- Supprimer les mentions « Étape 1 », « Étape 2 », etc. sur toute la page.
- Sur-titre : **NOS PROGRAMMES**
- H2 : **Deux programmes pour renforcer les compétences qui font la différence**
- Introduction : **Choisissez votre univers, puis le module qui répond à votre besoin du moment.**

### Carte Social Média

- Titre : **Social Média**
- Description : **Pour les professionnels du Social Media et de la communication qui souhaitent actualiser leurs pratiques et renforcer des compétences précises.**
- Informations : **9 modules · 3 thématiques · Sessions de coaching collectif**
- CTA : **Découvrir le programme Social Média**

### Carte Entrepreneurs

- Titre : **Entrepreneurs**
- Description : **Pour les entrepreneurs en activité ou en lancement qui souhaitent renforcer les compétences utiles au développement de leur activité.**
- Informations : **9 modules · 3 thématiques · Sessions de coaching collectif**
- CTA : **Découvrir le programme Entrepreneurs**

## Section Thématiques et modules

- Sur-titre : **LES THÉMATIQUES**
- H2 : **Explorez les thématiques de chaque programme**
- Introduction : **Sélectionnez un programme, puis explorez les modules disponibles dans chaque thématique. Chaque module peut être choisi et acheté indépendamment.**
- Conserver le sélecteur Social Média / Entrepreneurs et les accordéons.
- Retirer la phrase publique « Le sélecteur bascule instantanément, sans rechargement ».

### Thématiques Social Média

- Fondations stratégiques
- Copywriting & contenu
- Plateformes

### Thématiques Entrepreneurs

- Fondations du business
- Vente & acquisition
- Visibilité

### Carte module

Afficher : numéro, titre complet, formateur, durée, prix et CTA **Découvrir le module**. Tous les titres doivent provenir du cahier des charges, sans texte d’exemple.

## Section Formateurs

- Sur-titre : **NOS FORMATEURS**
- H2 : **Des professionnels de terrain pour transmettre ce qu’ils pratiquent**
- Introduction : **Chaque module est conçu et animé par un professionnel expérimenté, qui prolonge l’apprentissage lors des sessions de coaching collectif.**
- Carte : photographie, nom, expertise, programme ou modules associés, CTA **Voir le profil**.
- CTA général : **Découvrir tous les formateurs**

## FAQ de l’accueil

- Sur-titre : **QUESTIONS FRÉQUENTES**
- H2 : **Avant de commencer, voici l’essentiel**
- Introduction : **Retrouvez les réponses aux principales questions concernant l’achat, l’accès aux modules et les sessions de coaching.**
- **Puis-je acheter un seul module ?** Oui. Chaque module est indépendant et peut être acheté séparément selon vos besoins.
- **Combien coûte un module et comment payer ?** Chaque module coûte 10 000 FCFA TTC. Le paiement s’effectue via FeexPay avec les moyens proposés sur la plateforme.
- **Combien de temps puis-je accéder à mon module ?** L’achat donne un accès à vie au module depuis votre espace apprenant.
- **Comment participer aux sessions de coaching collectif ?** Le calendrier est disponible dans l’espace apprenant. Avant de rejoindre une session, l’apprenant doit compléter sa fiche afin de fournir au formateur les informations utiles sur son profil et son projet.
- **Est-ce qu’un certificat est délivré ?** Un certificat de participation est mis à disposition après la réalisation du module.
- **Puis-je suivre les modules depuis mon téléphone ?** Oui. La plateforme est responsive et accessible sur mobile. Elle peut également être installée comme une PWA.
- Bloc d’assistance : **Vous avez une autre question ? Contactez directement notre équipe sur WhatsApp.**
- CTA : **Discuter sur WhatsApp**

## Footer

Texte : **E-Masterclass Big Five propose des modules de formation en ligne conçus pour aider les professionnels du Social Media et les entrepreneurs d’Afrique francophone à renforcer des compétences précises.**

Ajouter le lien **Blog** dans la colonne Plateforme. Conserver les programmes, le calendrier des sessions, les formateurs, Devenir formateur, Contact et FAQ, Mon espace et les liens légaux.

---

# 2. Page Programme Social Média

## Hero

- Sur-titre : **PROGRAMME**
- H1 : **Social Média**
- Description : **Des modules indépendants conçus pour les Social Media Managers, Community Managers et professionnels de la communication qui souhaitent actualiser leurs pratiques et renforcer des compétences ciblées.**
- Informations : **9 modules disponibles · 10 000 FCFA TTC par module · Accès à vie après l’achat · Coaching collectif de 2 heures — 25 places**
- Supprimer la mention publique « Phase 1 ».

## Liste des modules

- Sur-titre : **LES MODULES DU PROGRAMME**
- H2 : **Choisissez la compétence que vous souhaitez renforcer**
- Introduction : **Parcourez les modules par thématique. Chacun peut être acheté et suivi indépendamment, sans ordre imposé.**
- Filtres : Tous, Fondations stratégiques, Copywriting & contenu, Plateformes.
- Carte : numéro, thématique, titre, formateur, durée, prix, statut, CTA **Découvrir le module**.
- Retirer toute annotation comme « filtrage instantané » ou « fiche de teasing publiée depuis l’administration ».

## FAQ

- Sur-titre : **FAQ DU PROGRAMME**
- H2 : **Vos questions sur le programme Social Média**
- **Dans quel ordre suivre les modules ?** Aucun ordre n’est imposé. Vous pouvez commencer par le module qui correspond à votre besoin actuel. Les modules de la thématique « Fondations stratégiques » sont recommandés si vous souhaitez d’abord consolider vos bases.
- **Faut-il déjà travailler dans le Social Media ?** Le programme s’adresse principalement aux Social Media Managers, Community Managers et professionnels de la communication. Le niveau et les éventuels prérequis sont précisés sur chaque fiche module.
- **Comment participer aux coachings du programme ?** Les sessions sont organisées par thématique. Leur calendrier est disponible dans votre espace apprenant. Pour participer, vous devrez avoir accès à un module concerné et compléter préalablement votre fiche apprenant.
- **Puis-je acheter des modules dans les deux programmes ?** Oui. Les modules Social Média et Entrepreneurs achetés sont accessibles depuis le même espace apprenant.

---

# 3. Page Programme Entrepreneurs

Reprendre exactement la même structure que Social Média avec l’identité bleue.

## Hero

- Sur-titre : **PROGRAMME**
- H1 : **Entrepreneurs**
- Description : **Des modules indépendants conçus pour les entrepreneurs en activité ou en lancement qui souhaitent renforcer des compétences pratiques et faire évoluer leur activité.**
- Informations : **9 modules disponibles · 10 000 FCFA TTC par module · Accès à vie après l’achat · Coaching collectif de 2 heures — 25 places**

## Liste des modules

- Sur-titre : **LES MODULES DU PROGRAMME**
- H2 : **Choisissez la compétence que vous souhaitez renforcer**
- Introduction : **Parcourez les modules par thématique. Chacun peut être acheté et suivi indépendamment, selon les besoins actuels de votre activité.**
- Filtres : Tous, Fondations du business, Vente & acquisition, Visibilité.

## FAQ

- Sur-titre : **FAQ DU PROGRAMME**
- H2 : **Vos questions sur le programme Entrepreneurs**
- **Faut-il avoir déjà lancé son activité ?** Non. Certains modules s’adressent aux porteurs de projet, tandis que d’autres répondent aux besoins d’entrepreneurs déjà en activité. Le public concerné est précisé sur chaque fiche module.
- **Dans quel ordre suivre les modules ?** Aucun ordre n’est obligatoire. Vous pouvez choisir directement le module correspondant à votre besoin : valider une idée, fixer vos prix, structurer une offre, vendre ou développer votre visibilité.
- **Les modules sont-ils adaptés à tous les secteurs ?** Les compétences abordées sont applicables à différentes activités. Chaque fiche module précise néanmoins ses objectifs, ses exemples et ses éventuels prérequis.
- **Comment participer aux coachings du programme ?** Les sessions sont organisées par thématique et apparaissent dans votre espace apprenant. Pour participer, vous devrez avoir accès à un module concerné et compléter votre fiche apprenant.

---

# 4. Gabarit des fiches modules

Conserver une structure commune, mais avec des textes propres à chaque module : fil d’Ariane, H1, promesse, problème traité, public, prérequis, programme, acquis, livrable, points forts, formateur, FAQ et achat.

## Exemple Social Média — Module 05

- Fil d’Ariane : **Social Média / Copywriting & contenu / Module 05**
- H1 : **Accroches qui stoppent le scroll & IA copywriting**
- Promesse : **Apprenez à construire plus rapidement des accroches capables de retenir l’attention, avec une méthode claire et l’IA comme assistant.**

### Pourquoi ce module ?

**Une publication peut être utile, bien conçue et correctement ciblée sans retenir l’attention si son ouverture manque d’impact. Ce module vous aide à structurer vos premiers mots, varier vos angles et produire plus rapidement sans déléguer votre réflexion à l’IA.**

### Pour qui ?

- Vous gérez les réseaux sociaux d’une marque ou de plusieurs clients.
- Vos contenus peinent à retenir l’attention.
- Vous souhaitez produire plus rapidement sans sacrifier la qualité.

### Prérequis

**Aucun prérequis particulier. La méthode est expliquée et appliquée progressivement pendant le module.**

### Programme

- Introduction — Présentation du module et de votre formateur
- Chapitre 1 — Anatomie d’une accroche qui stoppe le scroll
- Chapitre 2 — Écrire 10 accroches en 15 minutes : la méthode
- Chapitre 3 — Utiliser l’IA comme assistant copywriting, pas comme remplaçant

### Acquis

- reconnaître les éléments qui rendent une accroche plus efficace ;
- produire plusieurs propositions rapidement ;
- utiliser l’IA pour enrichir la réflexion et varier les angles.

### Livrable

**Une bibliothèque personnelle de 30 accroches adaptées à votre secteur, accompagnée d’une routine de travail pour produire plus rapidement de nouvelles propositions avec l’aide de l’IA.**

### Formateur

- H2 : **Coury Othniel**
- Fonction : **Copywriter · Formateur de la thématique Copywriting & contenu**
- Présentation : **Coury Othniel accompagne des marques dans la conception de contenus et de messages capables de retenir l’attention et de soutenir leurs objectifs de communication. Dans ce module, il partage une méthode issue de sa pratique quotidienne du copywriting.**
- Information : **3 modules disponibles dans la thématique Copywriting & contenu**
- CTA : **Découvrir le profil du formateur**

### FAQ du module

- **Ai-je besoin d’un outil d’IA payant ?** Non. Le module ne dépend pas d’un outil payant particulier. Les fonctionnalités nécessaires et les différentes options sont présentées pendant le module.
- **La méthode peut-elle s’appliquer à tous les secteurs ?** Oui. Les principes enseignés sont adaptables à différents secteurs. Les exercices vous permettent de travailler directement à partir de votre activité, de votre marque ou de vos clients.
- **La session de coaching collectif est-elle comprise dans le prix ?** Oui. L’achat donne accès aux sessions liées à la thématique du module, selon le calendrier et les places disponibles. Votre fiche apprenant devra être complétée avant votre participation.
- **Puis-je revoir le module après l’avoir terminé ?** Oui. Vous conservez un accès à vie au module depuis votre espace apprenant.

## Exemple Entrepreneurs — Module 02

- Fil d’Ariane : **Entrepreneurs / Fondations du business / Module 02**
- H1 : **Fixer le juste prix de ses produits et services**
- Promesse : **Apprenez à fixer un prix qui couvre vos coûts, valorise votre travail et reste cohérent avec votre marché.**

### Pourquoi ce module ?

**Un prix trop faible fragilise votre marge, tandis qu’un prix mal aligné avec le marché peut freiner la vente. Ce module vous aide à sortir des décisions prises uniquement au feeling pour construire et défendre un prix fondé sur des éléments concrets.**

### Pour qui ?

- Vous lancez ou gérez votre activité.
- Vous ne connaissez pas précisément votre coût de revient.
- Vous diminuez vos prix dès qu’un client négocie.
- Vous souhaitez mieux défendre la valeur de votre offre.

### Prérequis

**Aucun prérequis particulier. Prévoyez simplement les informations disponibles sur vos coûts, vos charges et vos prix actuels.**

### Programme

- Introduction — Présentation du module et du formateur
- Chapitre 1 — Calculer son coût de revient réel, charges comprises
- Chapitre 2 — Comprendre les trois stratégies de prix et savoir quand les utiliser
- Chapitre 3 — Annoncer et défendre son prix face au client

### Acquis

- calculer son coût de revient ;
- choisir une stratégie de prix ;
- présenter et défendre son prix avec davantage d’assurance.

### Livrable

**Une grille tarifaire construite à partir des coûts réels et directement utilisable pour présenter ses prix aux clients.**

### Formateur

- H2 : **Jérémie De Clercq**
- Fonction : **Stratégie business · Formateur de la thématique Fondations du business**
- Présentation : **Jérémie De Clercq intervient sur les modules consacrés à la structuration des fondamentaux d’une activité. Dans ce module, il vous accompagne dans la construction d’un prix fondé sur vos coûts, votre offre et votre marché.**
- Information : **3 modules disponibles dans la thématique Fondations du business**
- CTA : **Découvrir le profil du formateur**

### FAQ du module

- **Dois-je déjà avoir lancé mon activité ?** Non. Le module convient également aux porteurs de projet qui souhaitent construire leurs premiers prix sur des bases plus solides.
- **Que faire si je ne connais pas encore tous mes coûts ?** Le module vous aide à identifier les principales catégories à prendre en compte. Vous pourrez commencer avec les données disponibles, puis affiner progressivement vos calculs.
- **La méthode fonctionne-t-elle pour les produits et les services ?** Oui. Le module présente les éléments à considérer selon la nature de l’offre afin d’adapter le calcul et la stratégie de prix.
- **Le coaching collectif est-il compris ?** Oui. L’achat donne accès aux sessions liées à la thématique, selon le calendrier et les places disponibles, après avoir complété votre fiche apprenant.

## Bloc d’achat commun

- Prix : **10 000 FCFA TTC**
- Information : **Paiement unique · Accès à vie**
- CTA : **Acheter ce module**
- Paiement : **Mobile Money, Djamo, Wave ou Visa via FeexPay**
- Inclus : module vidéo de 60 minutes, ressources pédagogiques, accès à vie, coaching collectif lié à la thématique, certificat de participation, communauté WhatsApp.
- Actions secondaires : Copier le lien, Partager sur WhatsApp.
- Remplacer « coaching session live mensuelle » par une formulation liée au calendrier de la thématique.

---

# 5. Page Formateurs

## Hero

- Sur-titre : **LES EXPERTS E-MASTERCLASS BIG FIVE**
- H1 : **Les formateurs**
- Description : **Découvrez les professionnels qui conçoivent les modules et partagent des méthodes issues de leur pratique. Ils prolongent également l’apprentissage lors des sessions de coaching collectif.**

## Clarification coaching

- Coaching collectif : compris avec les modules concernés.
- Coaching privé : réservé séparément, **50 000 FCFA par heure**.

## Carte formateur

Photographie, nom, expertise, courte présentation, programme associé, nombre de modules, modules cliquables, tarif du coaching privé, CTA **Voir le profil et les modules**.

## Coaching privé

- Titre : **Coaching privé**
- Prix : **50 000 FCFA par heure**
- Texte : **Un accompagnement individuel, réservé et payé séparément des sessions collectives incluses avec les modules.**
- CTA : **Réserver un coaching privé**

---

# 6. Page Devenir formateur

- Sur-titre : **REJOINDRE E-MASTERCLASS BIG FIVE**
- H1 : **Devenir formateur E-Masterclass Big Five**
- Description : **Vous maîtrisez une compétence utile aux professionnels du Social Media ou aux entrepreneurs ? Proposez un module pratique et partagez votre expérience avec nos apprenants.**
- Information : **Notre équipe étudiera votre proposition et vous contactera principalement par WhatsApp pour poursuivre les échanges.**
- Champs : identité, WhatsApp, email, programme concerné, expertise, sujet proposé, années d’expérience, motivation, portfolio facultatif.
- CTA : **Envoyer ma candidature**
- Confirmation : **Votre candidature a bien été transmise. Notre équipe l’étudiera et vous contactera par WhatsApp si votre proposition correspond aux besoins du programme.**

---

# 7. Contact et FAQ

## Contact

- Sur-titre : **CONTACT ET ASSISTANCE**
- H1 : **Une question ? Parlons-en.**
- Description : **Consultez les réponses aux questions fréquentes ou contactez notre équipe. Pour une question rapide, privilégiez WhatsApp. Pour une demande détaillée ou administrative, utilisez le formulaire.**
- CTA WhatsApp : **Discuter sur WhatsApp**
- H2 formulaire : **Envoyez-nous un message**
- Champs : identité, email, WhatsApp facultatif, sujet, référence de paiement facultative, message.
- Sujets : Paiement, Accès à un module, Session de coaching, Certificat de participation, Problème technique, Autre demande.
- CTA : **Envoyer mon message**

## FAQ générale

### Achat et paiement

- **Puis-je acheter un seul module ?** Oui. Chaque module est indépendant et peut être acheté séparément.
- **Combien coûte un module ?** Chaque module coûte 10 000 FCFA TTC, sauf indication différente affichée sur sa fiche.
- **Quels moyens de paiement sont acceptés ?** Le paiement s’effectue via FeexPay avec les moyens proposés au moment de la commande, notamment Mobile Money, Djamo, Wave et Visa.
- **Quand mon module devient-il accessible ?** Le module apparaît dans votre espace apprenant après la confirmation du paiement.

### Accès aux modules

- **Combien de temps puis-je accéder à un module acheté ?** Vous conservez un accès à vie au module depuis votre espace apprenant.
- **Puis-je suivre les modules depuis mon téléphone ?** Oui. La plateforme est adaptée aux mobiles et peut également être installée comme une PWA.

### Coaching collectif

- **Comment participer à une session ?** Consultez le calendrier depuis votre espace apprenant. Vous devrez avoir accès à un module concerné et compléter votre fiche apprenant avant de rejoindre la session.
- **Comment suis-je informé d’une modification ou d’une annulation ?** Les informations concernant la création, la modification ou l’annulation d’une session sont envoyées par email et WhatsApp.

### Certificat et assistance

- **Quel document est délivré après le module ?** Un certificat de participation est disponible après la réalisation du module.
- **Que faire si une vidéo ne se charge pas ?** Vérifiez votre connexion, actualisez la page et essayez un autre navigateur. Si le problème persiste, contactez l’assistance en précisant le module, l’appareil et le navigateur utilisés.

### Achat définitif

- **Puis-je demander le remboursement d’un module ?** Les conditions applicables aux contenus numériques accessibles après paiement sont précisées dans les Conditions générales de vente. Cette réponse doit être validée avec le contenu juridique définitif.

---

# 8. Tunnel d’achat et authentification

## Progression

Afficher : **1. Compte · 2. Récapitulatif · 3. Paiement**

## Création de compte

- H1 : **Créez votre compte**
- Description : **Votre compte vous permettra de finaliser votre achat, d’accéder à vos modules et de suivre vos prochaines sessions.**
- Ajouter le pays au compte et ne pas le redemander dans la fiche apprenant.
- CTA : **Créer mon compte et continuer**
- Après connexion, conserver l’achat en cours.

## Récapitulatif

- H1 : **Vérifiez votre achat**
- Afficher module, programme, thématique, formateur, durée, accès à vie, coaching et total.
- CTA : **Confirmer et passer au paiement**
- Indiquer la redirection vers FeexPay.
- Conserver la case obligatoire concernant le contenu numérique et les CGV ; son texte définitif doit être validé juridiquement.

## Paiement

- H1 : **Choisissez votre moyen de paiement**
- Moyens : Mobile Money, Wave, Djamo, Visa.
- Prévoir les états : attente, vérification, succès, échec, nouvelle tentative, changement de moyen, double paiement détecté.
- Succès : **Paiement confirmé. Votre module est maintenant accessible à vie depuis votre espace apprenant.**
- CTA : **Accéder à mon module**

## Connexion

- H1 : **Connexion**
- Description : **Accédez à vos modules, vos sessions de coaching et vos certificats de participation.**
- CTA : **Me connecter**
- Prévoir mot de passe oublié et réinitialisation avec lien valable 30 minutes.

---

# 9. Blog à ajouter

Créer deux nouveaux gabarits.

## Liste des articles

- Sur-titre : **RESSOURCES ET CONSEILS**
- H1 : **Le blog E-Masterclass Big Five**
- Description : **Des conseils, méthodes et analyses pour aider les professionnels du Social Media et les entrepreneurs à actualiser leurs pratiques.**
- Catégories : Social Média, Entrepreneuriat, Actualités E-Masterclass Big Five.
- Prévoir article à la une, articles récents, filtre, pagination et CTA vers les programmes.

## Page article

Fil d’Ariane, catégorie, H1, introduction, auteur, date, temps de lecture, image, corps H2/H3, liens vers modules, articles associés, partage WhatsApp/Facebook/LinkedIn.

## CTA programmes

- Titre : **Envie d’approfondir cette compétence ?**
- CTA : **Découvrir les programmes E-Masterclass Big Five**

---

# 10. Éléments à conserver sans réécriture de fond

- Pages légales : conserver les gabarits, les textes définitifs seront fournis ou validés juridiquement.
- Cookies : conserver le bandeau et la fenêtre de personnalisation ; valider le texte juridiquement avant mise en production.
- Paiement FeexPay : ne pas représenter comme personnalisable une interface réellement contrôlée par FeexPay.
- Responsive : adapter tous les nouveaux textes sans débordement, conserver la navigation mobile et la logique PWA.

## Résultat attendu

Retourner une maquette mise à jour complète, cohérente sur desktop, tablette et mobile, sans texte technique visible, sans contenu d’exemple et sans modification non demandée de la direction artistique.
