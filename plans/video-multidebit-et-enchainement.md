# Plan de bataille — diffusion multi-débit (1080p · 720p · 480p) et enchaînement automatique

Rédigé le 21/09/2026, après la fusion de la médiathèque vidéo (`2de7b3f`).

---

## 1. Ce qui existe déjà

Deux chemins de diffusion cohabitent, et c'est de là que part tout le reste.

**Le chemin `hls`.** `scripts/transcoder-video.mjs` produit un flux à plusieurs
débits — 240p, 360p, 480p, 720p — en une seule passe ffmpeg, avec des images
clés alignées sur les segments (`-g 48 -keyint_min 48 -sc_threshold 0`), des
segments de six secondes et un `master.m3u8` écrit par `-var_stream_map`.
`scripts/publier-video.mjs` pousse le dossier sur R2 via wrangler. Le lecteur
lit ce flux avec hls.js, qui choisit le palier tout seul.

**Le chemin `fichier`.** Le back-office téléverse un MP4 unique, en multipart,
du navigateur vers le Worker vers R2, sans jamais passer par l'application
(`server/api/admin/video/{ouvrir,jeton,terminer}.post.ts`). Le chapitre reçoit
`video_format = 'fichier'` et le lecteur lit la balise `<video>` directement.

La différence qui compte : **le chemin `hls` n'est emprunté que par le jeu de
démonstration.** `grep "'hls'"` ne le trouve posé qu'à un seul endroit,
`server/data/db.ts:328`. Tout ce que l'équipe dépose depuis l'administration
depuis l'arrivée du téléversement est un MP4 en une seule définition. La
médiathèque, qui vient d'arriver, ne change rien à cela : `inscrireVideo` écrit
`format` à sa valeur par défaut, `'fichier'`.

Autrement dit : **le multi-débit est déjà construit, testé et servi — il n'est
simplement plus alimenté.** Le travail n'est pas d'écrire un lecteur adaptatif,
il est de rebrancher le transcodage sur le chemin que l'équipe emprunte
réellement.

Trois choses sont déjà en place et n'ont pas à être refaites :

- **La signature couvre le dossier, pas le fichier** (`server/utils/video.ts`).
  Un flux HLS entier — manifeste, sous-manifestes, centaines de segments — tient
  sous une seule autorisation. Rien à changer pour passer du MP4 au HLS.
- **Le Worker réécrit les manifestes** (`reecrirePlaylist`), ce qui règle le cas
  de Safari iOS, qui lit le HLS nativement et ne laisse pas intercepter ses
  requêtes.
- **Le cache est déjà correct** : `master.m3u8` à 60 s, segments en
  `immutable, max-age=31536000`.

Et côté lecture, `FICHIER_VIDEO = { hls: 'master.m3u8', fichier: 'video.mp4' }`
désigne deux fichiers **dans le même dossier**. Un flux transcodé peut donc
cohabiter avec le MP4 d'origine sous la même clé, sans nouvelle signature, sans
nouvelle entrée de médiathèque, sans invalidation de cache.

---

## 2. Multi-débit — le vrai chantier

### 2.1 La question à trancher avant tout le reste : où tourne ffmpeg ?

Rien dans Cloudflare Workers ne transcode. C'est la seule décision qui engage,
et elle commande le reste du lot. Trois formes, avec ce qui les départage.

**A — Le poste de travail (prolonger l'existant).**
Un script tire le MP4 déposé depuis R2, le transcode, repousse le dossier HLS,
bascule l'entrée de médiathèque. Les deux scripts existent déjà à 90 %.
*Coût d'infrastructure : nul. Coût humain : quelqu'un doit le lancer, et le
fichier fait l'aller-retour sur le lien montant d'Abidjan.* Sept cents
mégaoctets descendus puis un dossier de plusieurs gigaoctets remontés, par
chapitre — c'est là que cette option se juge, pas sur le code.

**B — Un exécutant distant qui dépile une file.**
Une table de travaux (`travaux_video` — elle est déjà dessinée dans
`plans/ok-refaisons-un-tour-snazzy-hoare.md:152`, statuts
`televerse · en-file · encodage · termine · echec`, mais **jamais créée** : la
migration n'existe pas), et un processus qui la lit, transcode, repousse. Il
tourne où l'on veut — conteneur Cloudflare, petite machine louée, n'importe
quoi qui ait ffmpeg et de la bande passante.
*Le fichier ne redescend jamais en Côte d'Ivoire.* Garde la chaîne R2 + HMAC
que le projet possède déjà et comprend. En échange : un service de plus à
surveiller, et l'échec d'un encodage devient un état à afficher dans
l'administration.

**C — Un service managé qui remplace la chaîne (Cloudflare Stream ou
équivalent).**
L'échelle de qualité, le stockage, la diffusion et les URL signées viennent
ensemble. Plus de ffmpeg, plus de Worker de diffusion, plus de
`verifierSignature` en double.
*En échange on jette une chaîne qui marche et qu'on maîtrise*, et la facture
suit la diffusion au lieu de suivre le stockage — c'est-à-dire qu'elle suit le
succès du site.

> **À vérifier avant de choisir C, et à ne pas prendre dans ce document :**
> la tarification et le modèle de facturation de Cloudflare Stream
> (<https://developers.cloudflare.com/stream/pricing/>), ainsi que l'état de
> disponibilité de Cloudflare Containers
> (<https://developers.cloudflare.com/containers/>) si l'on envisage B chez
> Cloudflare. Ces deux nombres bougent, et un plan qui les récite vieillit mal.

**Recommandation.** B, avec A comme dépannage immédiat. B garde la chaîne
existante — la signature nominative, le filigrane, la révocation de visionnage,
tout ce qui a été construit autour — et résout le seul problème que A ne résout
pas, l'aller-retour sur le lien montant. A reste utile tout de suite : il permet
de transcoder les vidéos déjà en ligne sans rien construire.

### 2.1 bis — Non, le Worker ne peut pas s'en charger

La question se pose naturellement, puisque c'est lui qui sert les vidéos. La
réponse est non, et il vaut mieux l'écrire une fois pour toutes.

**Ce qu'il fait.** Son chemin de service (`src/index.js:410-477`) vérifie la
signature, lit l'objet dans R2 et renvoie `objet.body` tel quel. La seule chose
qu'il réécrit est le *texte* d'un `.m3u8`, pour y recopier le jeton. Aucun octet
de vidéo n'est transformé.

**Pourquoi il ne peut pas.** Un Worker est un isolat V8 : pas de binaire natif,
donc pas de ffmpeg ; pas de processus fils ; une mémoire de l'ordre de 128 Mo
quand les sources font des centaines de mégaoctets ; un budget CPU en secondes
quand un encodage se compte en minutes. ffmpeg en WebAssembly existe mais reste
d'un ordre de grandeur trop lent, et dépasserait les deux limites à la fois.

**Et une raison de fond, indépendante de la plateforme.** Le multi-débit n'est
pas une transformation à la volée : un flux adaptatif suppose N rendus déjà
encodés, segmentés sur les mêmes images clés et listés dans un manifeste, entre
lesquels le lecteur bascule en cours de route. Transcoder à la demande, par
spectateur, referait le travail à chaque vue — l'inverse du « transcoder une
fois, servir sans calcul » qui fait tenir l'hébergement à quelques euros.

**Ce que Cloudflare sait faire, ailleurs que dans un Worker.** Stream (option C
ci-dessus), Containers — un conteneur ffmpeg que ce Worker déclencherait, soit
l'option B hébergée chez Cloudflare — et Media Transformations
(`/cdn-cgi/media/`), qui transforme un MP4 à la volée mais produit **un** rendu
par requête et non une échelle : elle ne donne pas de sélecteur de qualité, elle
donne une autre définition fixe.

**Le rôle qui lui revient vraiment.** Être le déclencheur. Il sait quand un
dépôt se finalise (`/_televersement/terminer`) : il peut mettre le travail en
file. Il ne fera jamais l'encodage.

### 2.2 La sémantique qui rend le chantier vivable : dépôt d'abord, encodage ensuite

Quelle que soit la forme retenue, **le dépôt ne doit jamais attendre
l'encodage.** Le MP4 arrive, le chapitre est immédiatement lisible en
`'fichier'`, et le flux HLS le remplace quand il est prêt. Un encodage qui
échoue laisse donc un chapitre lisible, pas un chapitre mort.

C'est aussi ce qui rend le lot réversible : tant que le MP4 reste dans le
dossier, revenir en arrière est un `update` d'une colonne.

### 2.3 L'échelle de qualité

La demande porte sur 1080p, 720p et 480p. **Ne pas supprimer 240p et 360p pour
autant** : le commentaire en tête de `transcoder-video.mjs` dit pourquoi ils
existent — « sur une connexion mobile ivoirienne, la lecture démarre en 240p et
monte si elle peut, au lieu de s'interrompre ». Les retirer ferait exactement le
contraire de ce que le multi-débit sert à faire.

L'échelle devient donc :

| Palier | Vidéo | Plafond | Audio | Profil |
|---|---|---|---|---|
| 240p | 400k | 600k | 64k | main |
| 360p | 800k | 1200k | 96k | main |
| 480p | 1400k | 2100k | 128k | main |
| 720p | 2800k | 4200k | 128k | main |
| **1080p** | **5000k** | **7500k** | **128k** | **high** |

Trois remarques sur ce tableau :

1. **Le profil devient un champ de palier.** Le script écrit déjà
   `-profile:v:${i}`, indexé par palier : ajouter `profil: 'high'` sur la seule
   ligne 1080p suffit, ce n'est pas un drapeau global à changer.
2. **Le garde-fou existe déjà.** `PALIERS.filter((p) => p.hauteur <= hauteurSource)`
   fait qu'une source en 720p ne produira jamais de 1080p — « agrandir une image
   ne lui ajoute pas de détail ». Rien à ajouter.
3. **Le 1080p double à peu près le poids stocké.** Cumul des débits sans lui :
   ≈ 5,4 Mbit/s. Avec lui : ≈ 10,4 Mbit/s. Pour un chapitre de vingt minutes,
   ≈ 810 Mo contre ≈ 1 560 Mo. Le chiffre à mettre en face de la décision n'est
   pas le prix du gigaoctet, c'est ce rapport-là.

**Deux points techniques à arbitrer dans le même lot :**

- `-preset veryfast` est un bon choix jusqu'à 720p ; à 1080p il coûte cher en
  débit pour la qualité rendue. `fast` ou `medium` donnent une image nettement
  meilleure au même plafond, contre un temps d'encodage multiplié. Le bon
  arbitrage dépend de l'option retenue en 2.1 : sur un poste de travail (A), le
  temps est la ressource rare ; sur un exécutant distant (B), il ne l'est plus.
- **L'audio est aujourd'hui réencodé une fois par palier** (`paliers.forEach`
  pousse `-map a:0` autant de fois qu'il y a de paliers). À cinq paliers, cinq
  copies identiques de la même bande son dans le seau. Un groupe audio HLS
  (`#EXT-X-MEDIA`) les ramènerait à une, mais change la syntaxe de
  `-var_stream_map`. *Optionnel, pas bloquant* — à faire seulement si le poids
  gêne.

### 2.4 Les pièges — à lire avant d'écrire une ligne

**① La bascule de format doit se propager à tous les chapitres.**

C'est le piège principal, et il est neuf : il naît de la médiathèque fusionnée
ce matin. La migration le dit elle-même — les colonnes `video_*` du chapitre
« en sont la copie, tenue à jour au rattachement pour éviter une jointure sur le
chemin de lecture ». `attacher.post.ts` recopie `video.format` au moment du
rattachement, et **rien n'existe pour mettre à jour les chapitres quand
`videos.format` change plus tard.**

Passer `videos.format` de `'fichier'` à `'hls'` sans rediffuser la valeur vers
tous les `chapitres.video_id = <cette vidéo>` laisse ces chapitres demander
`video.mp4` pendant que la médiathèque annonce un flux. Le lecteur reçoit
`format: 'fichier'`, n'appelle pas hls.js, et **perd silencieusement le
multi-débit qu'on vient de produire.** Aucun typecheck ne l'attrape.

**② La propagation ne doit surtout pas passer par `majVideoChapitre`.**

La fonction se termine par `await retirerEtatPret(id)`. L'appeler pour basculer
un format ferait perdre son état « prêt » à chaque chapitre concerné — un
chapitre validé redeviendrait à valider parce qu'on a amélioré sa qualité
d'image. Il faut un `update` ciblé sur `video_format` seul.

**③ Que devient `video.mp4` après l'encodage ?**

Le garder double le stockage. L'effacer fait tomber en 404 tout chapitre dont la
bascule aurait échoué — voir ① — et interdit le retour en arrière décrit en 2.2.
*Recommandation : le garder jusqu'à ce que la bascule soit vérifiée sur tous les
chapitres attachés, puis l'effacer dans une passe de nettoyage séparée, jamais
dans le même geste que la bascule.*

**④ La médiathèque refuse aujourd'hui de supprimer une vidéo `'hls'`.**

`server/api/admin/mediatheque/supprimer.post.ts:36` lève un 409 : « son dossier
contient des centaines de fichiers et se retire en ligne de commande ». C'était
vrai quand `'hls'` ne désignait que les démonstrations transcodées à la main.
Dès que l'encodage devient la voie normale, ce refus bloque l'équipe sur toutes
ses vidéos. Il faut le lever et faire supprimer le préfixe entier par le Worker
(une route `objet` qui liste et efface le préfixe, au lieu d'un seul objet).
`app/components/admin/Mediatheque.vue:234` masque aussi le bouton dans ce cas :
même correction.

**⑤ Le Worker n'a besoin d'aucune modification pour servir le flux** — il le
fait déjà. Mais la suppression de ④, elle, en demande une.

### 2.5 Le sélecteur de qualité manuel

Aujourd'hui `ControlesVideo.vue` **affiche** la qualité (« Auto 480p ») sans
permettre de la choisir. Ajouter le choix demande :

- côté composable, exposer les paliers (`hls.levels`) et un setter
  (`hls.currentLevel`, `-1` pour revenir en automatique) ;
- côté barre, une pilule qui ouvre la liste, sur le modèle de la pilule de
  vitesse qui existe déjà ;
- **le masquer dans deux cas** : en `format: 'fichier'` (rien à choisir — le
  composant le sait déjà par sa prop `adaptative`) et sur la lecture native de
  Safari iOS, qui n'expose aucune API de niveau. Ce second cas n'est pas couvert
  par `adaptative` : il faut le détecter à part (`hls === null` alors que le
  format est `'hls'`).

`capLevelToPlayerSize: true` reste : il empêche un téléphone d'aller chercher du
1080p qu'il ne peut pas afficher. Un choix manuel doit pouvoir passer outre —
sinon le réglage ne fait rien en fenêtre réduite, et personne ne comprend
pourquoi.

---

## 3. Enchaînement automatique

### 3.1 Bonne nouvelle : l'essentiel est écrit

`app/pages/mon-espace/lecture/[slug].vue` porte déjà tout le mécanisme :
`lancerEnchainement()` déclenché par `surFin`, décompte de dix secondes,
surimpression avec le titre du chapitre suivant, boutons « Passer maintenant » et
« Rester sur ce chapitre », annulation sur tout changement de chapitre, nettoyage
au démontage. Les autorisations des chapitres suivants sont **déjà toutes
chargées** par le même appel — l'enchaînement ne coûte aucun aller-retour.

### 3.2 Le bug : le chapitre suivant s'ouvre en pause

Le décompte arrive à zéro, `allerAuChapitre(index + 1)` pose le nouvel index,
`watch([index, source])` appelle `lecteur.charger()` — et **personne n'appelle
`play()`**.

Dans `useLecteurVideo`, la seule relance automatique vit dans
`onLoadedmetadata`, sous `if (repriseApres !== null)`. Or `repriseApres` n'est
posé que par `rechargerEnPlace()`, c'est-à-dire uniquement au renouvellement
d'une autorisation expirée. L'enchaînement ne passe jamais par là.

Résultat : l'apprenant regarde un décompte lui annoncer « Lecture dans 1
seconde », voit l'écran changer de chapitre, et doit cliquer pour lancer. C'est
l'unique raison pour laquelle l'enchaînement paraît ne pas fonctionner.

**Correction.** Ajouter au composable un drapeau de même nature que
`reprendreLecture`, mais posé explicitement par l'appelant — par exemple une
fonction rendue `lireDesQuePret()` — et le consommer dans `onLoadedmetadata`.
Deux exigences :

- **Un seul point d'appel volontaire.** `allerAuChapitre` sert aussi au clic
  dans le sommaire et au lien « Chapitre suivant → » en bas de page. Passer la
  décision en paramètre (`allerAuChapitre(i, { lire: true })`) plutôt que de la
  déduire du contexte. *Recommandation : lire dans les trois cas* — on est dans
  un lecteur, et choisir un chapitre y veut dire le regarder — mais que ce soit
  écrit, pas hérité.
- **Traiter le refus du navigateur.** `play()` est aujourd'hui appelé partout en
  `.catch(() => undefined)`. Après une longue pause, dans un onglet passé en
  arrière-plan, ou si l'interaction initiale a expiré, la promesse est rejetée
  et l'apprenant se retrouve devant une image figée sans rien à cliquer. Il faut
  un bouton de lecture en surimpression dans ce cas précis. (Le cas nominal
  passe : le document porte déjà une interaction utilisateur puisque l'apprenant
  a lancé le chapitre précédent.)

### 3.3 Ce qui manque autour

**Une préférence, et qu'elle tienne.** Aujourd'hui « Rester sur ce chapitre »
vaut pour un chapitre. Un apprenant qui refuse l'enchaînement trois fois de
suite le refuse en fait tout court. Ajouter un interrupteur — dans la
surimpression, « Ne plus enchaîner » — et le retenir en `localStorage`, à côté
de `emc-derniere-lecture` qui existe déjà. Le repli doit être « enchaîner » :
c'est le comportement attendu d'un lecteur de cours.

**La fin du module.** Sur le dernier chapitre, `chapitreSuivant` vaut `null`,
`lancerEnchainement()` retourne aussitôt, et **rien ne se passe** — la vidéo
s'arrête, l'apprenant est seul. C'est le moment le plus utile de tout le
parcours : c'est là qu'on propose l'attestation, le module suivant du programme,
ou le retour à la fiche. Une surimpression de fin de module, distincte du
décompte, à câbler sur le même `surFin`.

**Une petite perte à corriger au passage.** `charger()` remet `secondesVues` et
`secondesEnvoyees` à zéro. Un changement de chapitre en pleine lecture perd donc
jusqu'à dix secondes de visionnage non encore remontées — le temps depuis le
dernier envoi. Vider le compteur (`envoyerVisionnage()`) **avant** de changer
d'index le règle. Sans cela, plus l'enchaînement marche, plus il rogne la
progression qu'il est censé faire avancer.

---

## 4. Ordre de bataille

Les deux chantiers sont indépendants. L'enchaînement est petit, entièrement
côté client, et rend le lecteur cohérent tout de suite : il passe devant.

| Lot | Contenu | Dépend de |
|---|---|---|
| **1 — Enchaînement** | drapeau `lireDesQuePret()` + point d'appel explicite ; refus de `play()` traité ; vidage du compteur avant changement d'index | — |
| **2 — Fin de module & préférence** | surimpression de fin de module ; « Ne plus enchaîner » en `localStorage` | 1 |
| **3 — Échelle 1080p** | palier 1080p + `profil` par palier dans `transcoder-video.mjs` ; arbitrage du `preset` | — |
| **4 — Bascule de format sûre** | `update` ciblé de `video_format` sur tous les chapitres d'une vidéo, **sans** `retirerEtatPret` ; suppression d'un préfixe HLS depuis la médiathèque (points ①②④) | 3 |
| **5 — Pipeline d'encodage** | migration `travaux_video` ; mise en file à la fin de `terminer.post.ts` (là où `videoFormat: 'fichier'` est écrit aujourd'hui) ; exécutant ; état visible dans l'administration | 4, **et la décision 2.1** |
| **6 — Sélecteur de qualité** | ~~paliers exposés, pilule dans la barre, masquage `fichier` + Safari natif~~ — **fait le 21/09/2026** : `niveaux`/`niveauChoisi`/`choisirNiveau()` dans le composable, pilule cyclante dans la barre, étiquette inerte quand il n'y a rien à choisir. Vérifié au navigateur : le choix de 240p envoie bien tous les segments sur cette variante. Sans effet tant que les vidéos restent des MP4 uniques. | 3 |

Les lots 1 à 4 ne demandent aucune décision d'infrastructure et peuvent partir
tout de suite. Le lot 5 attend la réponse à 2.1.

---

## 5. Décisions prises — 21/09/2026

1. **Où tourne ffmpeg : option B**, un exécutant qui dépile une file. Le fichier
   ne redescend jamais sur le lien d'Abidjan, et la chaîne R2 + HMAC reste en
   place — avec elle l'autorisation nominative, le filigrane et la révocation de
   visionnage. Cloudflare Stream a été écarté après chiffrage : 5 $/mois de
   plancher et 1 $ par millier de minutes **livrées**, là où l'égress R2 est
   gratuit. Le seuil de bascule tombe vers 5 000 minutes livrées par mois, soit
   une quinzaine d'apprenants parcourant tout le catalogue — et il faudrait en
   plus reporter toute la couche de sécurité sur le système de jetons de Stream.
2. **`medium` à 1080p.** Le temps d'encodage cesse d'être la ressource rare dès
   lors qu'il ne tourne plus sur un poste de travail, et `veryfast` coûtait cher
   en débit pour la qualité rendue.
3. **`video.mp4` est gardé après encodage.** Il rend la bascule réversible et
   couvre un fan-out manqué. Un nettoyage séparé viendra plus tard, jamais dans
   le même geste que la bascule.
4. **Le clic dans le sommaire lance la lecture**, au même titre que
   l'enchaînement — mais par un paramètre explicite, pas par héritage de
   contexte.
5. **Groupe audio partagé : reporté.** À reprendre seulement si le poids gêne.
