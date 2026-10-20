# CSP du site public : campagne en observation, puis bascule

Mise en place le 20/10/2026, à la suite de l'audit de sécurité du même jour.

La politique appliquée au site public (`CSP_SITE`, dans `nuxt.config.ts`) admet
`https:` comme source de scripts, de connexions et de cadres. Une politique plus
stricte tourne à côté, **en observation** : le navigateur ne bloque rien, il
signale seulement ce qu'elle aurait refusé. Ce document dit comment lire ces
signalements, et quand et comment rendre cette politique bloquante.

## 1. Ce qui est en place

Chaque page du site public reçoit deux en-têtes :

| En-tête | Contenu | Défini dans |
|---|---|---|
| `Content-Security-Policy` | politique appliquée, permissive (`https:`) | `nuxt.config.ts`, `CSP_SITE` |
| `Content-Security-Policy-Report-Only` | hôtes nommés, scripts sous nonce | `server/utils/csp.ts` |

- **Nonce.** `server/plugins/csp.ts` tire 16 octets aléatoires par page et les
  pose sur les balises `<script>` et `<link>` que Nuxt écrit dans `<head>` et en
  fin de `<body>` : module d'entrée, table d'import, configuration
  `window.__NUXT__`, charge utile JSON, SDK FeexPay, et le script
  `window.__NUXT_SITE_CONFIG__` de nuxt-site-config. Le contenu de la page
  (articles, `v-html`) n'en reçoit jamais. `app/plugins/tracking.client.ts`
  reporte le nonce sur `gtm.js` (GTM le transmet aux scripts qu'il ajoute) et
  sur le code additionnel de l'écran 19.
- **Collecte.** Le navigateur envoie ses rapports à `POST /api/csp-rapport`.
  Chrome et Edge les regroupent (`report-to`), avec jusqu'à une minute de
  retard. Firefox et Safari en envoient un par violation (`report-uri`). La
  route est plafonnée à 100 envois par heure et par adresse IP. Elle répond 204
  et écrit une ligne par violation dans les journaux.
- **Hors champ.** Les réponses de `/api/` ne contiennent pas de HTML et ne
  reçoivent pas la politique en observation. Le back-office garde sa propre
  politique (`CSP_ADMIN`), déjà stricte.

### Hôtes nommés au départ

| Usage | Hôtes |
|---|---|
| Zoom (Meeting SDK 6.2.0) | `zoom.us`, `*.zoom.us` (dont `source.zoom.us`), `wss://*.zoom.us`, `dmogdx0jrul3u.cloudfront.net`, `d1cdksi819e9z7.cloudfront.net` |
| FeexPay | `feexpay.me`, `*.feexpay.me` (dont `api-v2`) ; `api.ipify.org` (le SDK y demande l'IP du payeur) ; polices `fonts.googleapis.com`, `fonts.gstatic.com`, `fonts.cdnfonts.com` |
| GTM, GA4, Google Ads | `www.googletagmanager.com`, `www.google-analytics.com`, `*.google-analytics.com`, `*.analytics.google.com`, `www.googleadservices.com`, `googleads.g.doubleclick.net`, `*.g.doubleclick.net`, `www.google.com` |
| Pixels de l'écran 19 | `connect.facebook.net`, `www.facebook.com`, `analytics.tiktok.com`, `snap.licdn.com`, `px.ads.linkedin.com` |
| Vidéo | le Worker de `VIDEO_BASE_URL` (connexions et médias) |

Les images restent ouvertes à tout `https:` (pixels, visuels des articles,
avatars Zoom), et `'unsafe-eval'` est toujours admis : le Meeting SDK et les
variables JavaScript personnalisées de GTM en ont besoin.

### Vérifier après la mise en ligne

1. `curl -sI https://emasterclass.bigfive.solutions/ | grep -i report-only` doit
   afficher la politique, avec un nonce différent à chaque appel.
   `curl -sI https://emasterclass.bigfive.solutions/api/modules` ne doit pas
   l'afficher.
2. Dans Chrome, sur la page d'accueil, ouvrir la console et provoquer une
   violation volontaire :
   `document.head.append(Object.assign(document.createElement('script'), {textContent: '1'}))`.
   La console annonce une violation « report-only », et le script s'exécute
   quand même.
3. Une minute plus tard, une ligne `[csp]` avec `"page":"/"` et
   `"bloque":"inline"` apparaît dans les journaux Vercel. Sinon, chercher un 403
   ou un 415 sur `/api/csp-rapport` dans les journaux.

Certains navigateurs n'envoient aucun rapport. Pendant les essais du 20/10, le
navigateur intégré à une application Electron n'en a envoyé aucun : il coupe
l'API Reporting, et ignore alors `report-uri`, puisque `report-to` est présent.
D'autres dérivés de Chromium qui coupent cette API (Brave) peuvent faire de
même. Ils restent minoritaires : les rapports de Chrome, Edge, Firefox et
Safari suffisent à la campagne.

## 2. Lire les rapports

Dans Vercel, ouvrir le projet, puis **Logs**, et filtrer sur `[csp]`. Chaque ligne
ressemble à :

```
[csp] {"directive":"connect-src","bloque":"https://region1.google-analytics.com","page":"/modules/*","source":"https://www.googletagmanager.com/gtag/js","ligne":412,"colonne":88,"mode":"observation"}
```

| Champ | Sens |
|---|---|
| `directive` | la règle qui aurait refusé : `script-src-elem`, `connect-src`, `frame-src`… |
| `bloque` | ce qui aurait été refusé, réduit à son origine ; `inline` pour un script ou un style écrit dans la page, `eval`, `data`, `blob` |
| `page` | le chemin de la page. Les segments variables (jeton, numéro d'attestation, slug avec chiffres) sont remplacés par `*` |
| `source`, `ligne`, `colonne` | le script qui a fait la demande |
| `extrait` | les 40 premiers caractères d'un script en ligne refusé, sans adresse e-mail ni suite de chiffres |
| `mode` | `observation` aujourd'hui, `bloquant` après la bascule |

La route ne garde ni l'adresse IP, ni le navigateur, ni la page de provenance,
ni la requête des adresses. Les rapports dus aux extensions du navigateur sont
écartés.

### Que faire de chaque cas

| Rapport | Lecture | Action |
|---|---|---|
| `bloque` est un hôte attendu : nouvelle balise GTM, page de paiement, serveur Zoom | il manque à la liste | l'ajouter dans `server/utils/csp.ts`, dans la liste de la bonne directive, avec un commentaire qui dit qui l'appelle |
| `script-src-elem`, `bloque: inline`, `source` sur `googletagmanager.com` | balise « HTML personnalisé » de GTM sans nonce | dans GTM, créer une variable JavaScript personnalisée `function(){var s=document.querySelector('script[nonce]');return s&&s.nonce;}`, puis écrire `<script nonce="{{Nonce CSP}}">` dans la balise. Mieux encore : la remplacer par un modèle de la galerie |
| `script-src-elem`, `bloque: inline`, `extrait` = début du code additionnel | code de l'écran 19 qui écrit lui-même un script en ligne | le réécrire pour charger un fichier (`src=`), ou le passer dans GTM |
| `script-src-attr`, `bloque: inline` | gestionnaire `onclick=`, `onload=`… écrit dans le HTML | trouver d'où il vient. Si l'extrait est `this.setAttribute('data-error', 1)`, c'est `<NuxtImg>` : @nuxt/image a changé son code, mettre à jour l'empreinte dans `GESTIONNAIRES_ADMIS` |
| `bloque` inconnu, sur une page sans tiers, sans `source` connue | script injecté par un antivirus, un traducteur, un logiciel espion, ou tentative d'injection | ne pas l'ajouter. Le noter et voir s'il revient |
| `frame-src` sur une page `/achat/*` | page d'opérateur ou de banque ouverte dans un cadre par FeexPay | ajouter l'hôte, s'il appartient à FeexPay ou à son prestataire de paiement |

Un hôte ne s'ajoute que si l'on sait qui l'appelle et pourquoi. Pour garder la
liste courte, on s'en tient à la directive concernée.

## 3. Parcours à couvrir avant de basculer

Certains tiers ne se chargent que sur un parcours rare. Tant qu'un parcours n'a
pas tourné en production sous la politique en observation, ses hôtes ne sont
pas vérifiés.

- [ ] Pages publiques avec cookies de mesure **acceptés** : conteneur GTM chargé, et chaque balise (GA4, Meta, TikTok, LinkedIn) déclenchée au moins une fois. Code additionnel de l'écran 19, s'il est rempli.
- [ ] Mode Aperçu de GTM (Tag Assistant) sur une page publique.
- [ ] Achat FeexPay en `live` : Orange Money, MTN, Moov, puis Wave et la carte quand ils seront ouverts (`FEEXPAY_WAVE_ACTIVE`, `FEEXPAY_CARTE_ACTIVE`). Pour la carte, la page 3-D Secure s'ouvre dans un cadre dont on ne connaît pas encore l'hôte.
- [ ] Salle Zoom en `live` : sur ordinateur (Component View) et sur mobile (Client View), côté apprenant et côté formateur.
- [ ] Lecture vidéo avec hls.js (Chrome, Firefox, Android) et en HLS natif (Safari iOS), sous-titres compris.
- [ ] Installation de l'application (PWA) et page hors ligne.

## 4. Quand basculer

Les trois conditions doivent être remplies :

1. tous les parcours de la section 3 ont tourné au moins une fois en production depuis la mise en ligne de la politique en observation ;
2. depuis **sept jours d'affilée**, plus aucune ligne `[csp]` qui ne soit du bruit déjà identifié (extension, antivirus, traducteur) ;
3. chaque hôte ajouté en cours de campagne a sa justification en commentaire dans `server/utils/csp.ts`.

À défaut, compter au moins quatorze jours après la mise en ligne, et ne pas
basculer avant qu'une séance de coaching Zoom et un paiement par chaque
opérateur ouvert aient eu lieu.

## 5. Comment basculer

1. Dans `server/plugins/csp.ts`, écrire l'en-tête `content-security-policy` au
   lieu de `content-security-policy-report-only`. Garder `reporting-endpoints`.
   Sur les pages, cette valeur remplace celle de `routeRules` (`CSP_SITE`). Les
   routes `/api/` gardent `CSP_SITE`, sans conséquence puisqu'elles ne servent
   pas de HTML.
2. Garder `report-uri` et `report-to` dans la politique : les refus continuent
   d'arriver, avec `"mode":"bloquant"`.
3. Mettre à jour le commentaire de `CSP_SITE` dans `nuxt.config.ts`.
4. Après le déploiement, ouvrir la console du navigateur sur l'accueil, le
   catalogue, une fiche module, le tunnel d'achat, l'espace apprenant, une
   lecture vidéo et la salle de coaching. Aucun message « Refused to… » ne doit
   apparaître, et la page doit être interactive (l'hydratation s'est faite :
   les boutons répondent). Surveiller `[csp]` pendant 48 heures.
5. **Retour arrière** : annuler le commit de bascule. `CSP_SITE` reprend la main
   dès le déploiement suivant.

## 6. Ensuite

Une fois la politique stricte en place, une nouvelle campagne en observation
pourra viser, toujours par la même route :

- `'unsafe-eval'`, à réserver à la salle Zoom. Il faudra recharger la page
  complète en entrant dans la salle, puisque la politique est celle du premier
  document chargé ;
- `img-src` à hôtes nommés ;
- `'strict-dynamic'`, pour cesser d'énumérer les hôtes de scripts que GTM charge.
