# Diffusion des vidéos

Trois pièces, et rien de plus :

| Pièce | Rôle | Coût |
| --- | --- | --- |
| `ffmpeg`, sur un poste de travail | découpe une vidéo en flux HLS à plusieurs débits | nul |
| Cloudflare R2 | stocke les fichiers produits | gratuit sous 10 Go, sortie de données gratuite |
| Ce Worker | vérifie l'autorisation et sert les fichiers | gratuit sous 100 000 requêtes par jour |

L'application ne diffuse aucune vidéo. Elle vérifie l'accès une fois, puis
remet à l'apprenant une URL signée valable une demi-heure, que le lecteur
renouvelle sans interrompre la vidéo. Le Worker recalcule
la signature et sert le fichier. Aucun segment ne traverse le serveur Nuxt.

## En service depuis le 2 septembre 2026

Bucket `emasterclass-videos`, Worker déployé sur le compte `analyticsbigfive` :

```
https://emasterclass-videos.analyticsbigfive.workers.dev
```

Le `.env` de l'application pointe dessus (`VIDEO_BASE_URL`) et partage son secret de
signature. Redéployer après une modification du code :

```bash
cd infra/worker-video && npx wrangler deploy
```

Remonter le secret s'il change, des deux côtés à l'identique :

```bash
npx wrangler secret put VIDEO_SIGNING_SECRET
```

R2 doit être activé sur le compte Cloudflare, ce qui se fait une fois dans le tableau de
bord — la ligne de commande ne peut pas le faire et échoue avec le code 10042.

## Origines autorisées

`ORIGINES_AUTORISEES`, dans `wrangler.toml`, liste les sites d'où le lecteur peut lire les
vidéos. Une origine absente de cette liste se voit refuser la réponse par le navigateur
lui-même, avant toute vérification de signature : la vidéo reste sur son écran de
chargement, sans erreur visible ailleurs que dans la console. Un appel `curl` ne le montre
pas — il faut un vrai navigateur. Ajouter ici tout nouveau domaine de préproduction.

Le Worker de production n'accepte plus d'adresse locale (audit du 20/10). Pour lire les
vidéos depuis un poste de développement, déployer l'environnement `developpement`, qui lit
le même seau :

```bash
npx wrangler deploy --env developpement
npx wrangler secret put VIDEO_SIGNING_SECRET --env developpement
```

puis faire pointer `VIDEO_BASE_URL` du `.env` local sur son adresse
(`emasterclass-videos-developpement.<compte>.workers.dev`).

## Format de l'autorisation (20/10/2026)

Le message signé commence désormais par `lecture.` : `lecture.<dossier>.<échéance>.<apprenant>`.
Une échéance à plus de quatre heures est refusée, même bien signée. Pour ne couper aucune
vidéo pendant la mise à jour :

1. redéployer ce Worker avec `LECTURE_ANCIEN_FORMAT = "oui"` (il accepte les deux formats) ;
2. déployer l'application, qui signe au nouveau format ;
3. quatre heures plus tard, passer `LECTURE_ANCIEN_FORMAT` à `"non"` et redéployer.

## Cycle d'une vidéo

```bash
npm run video:transcoder -- medias/sources/chapitre.mp4 mod-monslug-ch01
npm run video:publier -- mod-monslug-ch01
```

Puis rattacher la clé au chapitre, dans `server/data/db.ts` pour le contenu de
référence, ou directement en base :

```sql
update chapitres set video_cle = 'mod-monslug-ch01', video_duree_secondes = 612
 where module_id = 'mod-monslug' and position = 1;
```

## Ce que la signature protège, et ce qu'elle ne protège pas

Elle empêche un lien d'être partagé durablement : l'autorisation expire après
une demi-heure et reste nominative, donc traçable. Le MP4 déposé est effacé du seau dès
que la vidéo passe en multi-débit (`npm run video:encoder`) : il ne reste pas
téléchargeable d'une seule requête sous la même autorisation que le flux. Elle n'empêche pas un
apprenant déterminé d'enregistrer son écran — aucune technologie grand public
ne le fait. C'est le rôle du filigrane nominatif affiché par le lecteur, qui
rend une rediffusion attribuable.
