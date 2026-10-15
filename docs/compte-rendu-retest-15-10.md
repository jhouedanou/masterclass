# Compte rendu — défauts D1 à D3 du retest du 15/10/2026

Classeur : « Recette E-Masterclass BigFive — clôture 15-10.xlsx », onglet « En attente client »,
partie 2. Vérifications faites le 15/10 au soir, en local, sur la base Supabase en ligne
(mêmes données que la production), connecté en administrateur. Aucune écriture en base.

| N° | Défaut | État | Cas |
|---|---|---|---|
| D1 | /admin/apprenants répond 500 | Corrigé (27d835b), vérifié | ADM-12 à retester · ADM-14 OK |
| D2 | Mot de passe de démonstration encore actif | Script prêt, à lancer par Big Five | SEC-11 KO |
| D3 | Séance passée affichée « EN DIRECT · 621 h » | Corrigé (27d835b, 2bc3bcc), vérifié | COL-05 OK |

## D1 — /admin/apprenants en erreur 500

**Constat.** « Cannot read properties of undefined (reading 'length') » à
`app/pages/admin/apprenants.vue:502`. Création et export d'apprenants inaccessibles.

**Cause.** Une fusion de branches a gardé l'API `server/api/admin/apprenants.get.ts`, qui renvoie
`{ apprenants, choix }`, et repris un écran qui attend une simple liste. L'écran forçait ce type
(`useFetch<Apprenant[]>`), si bien que le contrôle des types ne voyait rien. Le `v-for` parcourait
donc les clés de l'objet : la liste elle-même, puis `choix`, sans `coachingPrive`.

**Correctif.** L'écran ne retient que `apprenants` de la réponse (`transform`). L'export CSV, qui
recevait le même objet, est réparé du même coup.

**Vérifié.**
- Liste des 10 comptes affichée, sans erreur dans la console.
- Fiche d'un apprenant, avec « Coaching privé : 0 demande(s) ».
- Fenêtre « Historique ».
- Export CSV : 10 lignes, 13 colonnes.
- Formulaire « Ajouter un apprenant », avec Prénom et Nom séparés.

**Reste.** Créer un apprenant de test (ADM-12). Ce test n'a pas été rejoué, pour ne pas écrire
dans la base de production.

Captures : `ADM-12.png` (avant, onglet Captures ligne 547), `ADM-12-corrige.png` (après,
ligne 575).

## D2 — Mots de passe de démonstration

**Constat.** Lecture du 15/10 sur la base en ligne : 6 comptes sur 7 acceptent encore le mot de
passe commun du jeu de données.
- cossi@bigfiveabidjan.com (administrateur principal)
- jeremie.declercq@bigfiveabidjan.com
- houefa@bigfiveabidjan.com
- editeur@bigfive.ci
- formateur@bigfive.ci
- aya@example.ci

Seul jeanluc@ a été changé.

**Fait.**
- Le mot de passe n'apparaît plus dans le README ni dans le TODO. Il reste dans l'historique git et
  dans les commentaires des migrations déjà appliquées.
- Nouveau script `scripts/renouveler-mots-de-passe.ts`.

**Procédure.** À lancer par Big Five, depuis un poste dont le `.env` pointe sur la base en ligne :

```bash
npm run auth:renouveler
npm run auth:renouveler -- --appliquer
```

1. Le premier appel ne fait que lire : il dit quels comptes acceptent encore le mot de passe.
2. Le second tire un mot de passe aléatoire de 24 caractères par compte concerné, l'enregistre
   haché, le relit pour contrôle, puis l'affiche **une seule fois** dans le terminal. Rien n'est
   écrit sur disque.
3. Reporter chaque mot de passe dans un gestionnaire, puis le transmettre à son titulaire, qui le
   changera depuis « Paramètres ».
4. Remplacer `NUXT_SESSION_PASSWORD` sur Vercel, puis redéployer : les sessions déjà ouvertes
   restent sinon valides jusqu'à 30 jours.

Options :
- `--emails a@x,b@y` restreint la liste des comptes.
- Un compte déjà changé n'est pas touché, sauf avec `--tous`.

Le compte apprenant de démonstration aya@example.ci peut aussi être supprimé plutôt que renouvelé.

## D3 — Séance passée affichée « En direct »

**Constat.** ses-002 (19/09, 18:00–20:00 UTC) s'affichait « EN DIRECT · 621 h » sur
`/mon-espace/session/ses-002`.

**Cause.** Le badge ne comparait l'heure qu'au début de la séance, jamais à sa fin.

**Correctif.**
- L'API `server/api/mon-espace/session/[id].get.ts` renvoie la fin prévue (`salle.fin` = début +
  durée).
- La salle (`app/components/espace/SalleSession.vue`) affiche « TERMINÉE · 19 septembre à 20:00 »
  et « Cette séance s'est terminée le 19 septembre à 20:00 ».
- Dans les 30 minutes de battement après la fin, l'écran indique que la salle reste ouverte.

**Vérifié.** Badge et message corrects. Le bouton d'entrée est grisé, y compris pour le formateur
et l'administrateur : avant la retouche (2bc3bcc), l'hôte pouvait encore « Démarrer » une séance
passée.

Captures : `COL-05-seance-passee.png` (avant, ligne 1136), `COL-05-corrige.png` (après,
ligne 1105).

## Contrôles

- `npm run typecheck` : 0 erreur au 15/10 au soir. Les 5 erreurs TS2321 de `Referentiels.vue`,
  antérieures à ces correctifs, ont été levées par 2bc3bcc (D7).
- Les captures « après » sont recadrées : aucune coordonnée d'apprenant n'y figure.
- Le classeur a été réenregistré avec openpyxl, sans LibreOffice pour le recalculer. Excel
  recalcule les compteurs de la Synthèse à l'ouverture ; un aperçu rapide (Quick Look) peut les
  montrer vides.
