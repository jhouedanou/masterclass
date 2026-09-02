# Diffusion des vidéos

Trois pièces, et rien de plus :

| Pièce | Rôle | Coût |
| --- | --- | --- |
| `ffmpeg`, sur un poste de travail | découpe une vidéo en flux HLS à plusieurs débits | nul |
| Cloudflare R2 | stocke les fichiers produits | gratuit sous 10 Go, sortie de données gratuite |
| Ce Worker | vérifie l'autorisation et sert les fichiers | gratuit sous 100 000 requêtes par jour |

L'application ne diffuse aucune vidéo. Elle vérifie l'accès une fois, puis
remet à l'apprenant une URL signée valable quelques heures. Le Worker recalcule
la signature et sert le fichier. Aucun segment ne traverse le serveur Nuxt.

## Mise en service

```bash
cd infra/worker-video
npx wrangler r2 bucket create emasterclass-videos
npx wrangler secret put VIDEO_SIGNING_SECRET   # même valeur que le .env applicatif
npx wrangler deploy
```

Renseigner ensuite dans le `.env` de l'application :

```
VIDEO_BASE_URL=https://emasterclass-videos.<compte>.workers.dev
VIDEO_SIGNING_SECRET=<le même secret>
```

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
quatre heures et reste nominative, donc traçable. Elle n'empêche pas un
apprenant déterminé d'enregistrer son écran — aucune technologie grand public
ne le fait. C'est le rôle du filigrane nominatif affiché par le lecteur, qui
rend une rediffusion attribuable.
