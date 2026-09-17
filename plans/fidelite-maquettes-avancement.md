---
name: fidelite-maquettes-avancement
description: "État d'avancement du chantier « fidélité 1:1 maquettes » (lots 0/A/B/D/C) et ce qui reste à faire, avec le plan de référence"
metadata: 
  node_type: memory
  type: project
  originSessionId: dce2e949-4584-4380-86a3-998f0af21443
  modified: 2026-09-14T11:15:43.286Z
---

Chantier lancé le 14/09/2026 : fidélité 1:1 entre `maquettes/maquettes/{A,B,C,D}*.dc.html` et l'app. Plan complet (inventaire des ~120 écarts + plan par lot) : `/Users/bfa/.claude/plans/ok-refaisons-un-tour-snazzy-hoare.md`. Décisions : tout implémenter (Zoom SDK, Google Agenda, upload vidéo, Phase, Annonce, % profil, suppression 14 j), modes `simulation` quand clés absentes ; retirer ajouts hors maquette sauf « Gérer mes cookies » ; mot de passe 10 caractères.

**Fait (commité sur main)** :
- Lot 0 socle (`b6c5a0a`) : migration `20260915120000_socle_transverse.sql`, types, `shared/utils/profil.ts`, `app/utils/csv.ts`, composants `BarreOngletsMobile`, `MenuMobileAdmin`, `ui/Onglets`, `ui/Interrupteur`, suppression différée (API + tâche `comptes:purger` + `POST /api/taches/purger` clé `TACHES_CLE`), correctifs dev (icônes ph, asyncData).
- Lot A vitrine (`20170c7`) : migration `20260916120000_vitrine.sql`, fiche module 5 états + Points forts, tunnel, auth, contact, légal, blog paginé, responsive.

- Lot B apprenant (`40d46f3` « next ») puis salle partagée (`af5e8e7`) : la salle Zoom est passée dans `app/components/espace/SalleSession.vue`, réutilisée par `/formateur/session/[id]` en hôte ; assertions migration 11 dans `scripts/verifier-migrations.mjs`.

**Lot D formateur — écrit, NON commité, typecheck OK, db:verifier OK (113/113), écrans vérifiés au navigateur (1440 et 390)** : migration `20260918120000_formateur.sql` (`formateurs.email_pro/whatsapp/activation_coaching_demandee_le`, `sujets_sessions.lu_le`, `sessions_coaching.evenement_agenda_id`), `server/utils/googleAgenda.ts` (compte de service, JWT RS256, `GOOGLE_AGENDA_MODE=simulation`, rappels 24 h + 1 h, branché sur `admin/coaching-prive.patch` action `planifier`), `server/utils/portraits.ts` (stockage Supabase, seau `portraits` créé à la volée), API `formateur/apprenant/[id]`, `module/[id]`, `a-traiter`, `photo.post`, `demande-activation.post`, filtres période/module (`filtreDepuisRequete`, `bornesDuMois` dans `server/utils/formateur.ts`), layout formateur refait en en-tête + `BarreOngletsMobile`, pages `index` (bloc « À traiter », filtres), `modules` (+ `module/[id]`), `sessions`, `sujets/[sessionId]`, `apprenant/[id]`, `revenus` (+ `releve/[mois]` imprimable), `coaching-prive` (état verrouillé + demande d'activation), `profil` (photo, e-mail pro, WhatsApp, badge de rôle).

**⚠ Chantier parallèle dans le même dépôt (14/09 après 16 h 57)** : migrations 13 (`verification_attestation`) et 14 (`comptes_admin`), pages `app/pages/verifier/`, `server/api/verifier/`, `server/utils/reseau.ts`, `server/api/admin/certificats.post.ts`, plus des retouches à README, TODO, TheFooter, admin/apprenants, certificats. Les migrations 12, 13 et 14 sont déjà appliquées à la base Supabase distante. Le lot D n'a donc pas été commité : un commit emporterait ce travail tiers par les fichiers partagés (`shared/types/index.ts`, `server/database/types.ts`, `mappers.ts`, `comptes.ts`, `supabase/en-ligne/*`, `seed.sql`, `scripts/verifier-migrations.mjs`, `notifications.ts`). À trancher avec l'utilisateur.

**Ancien état du lot B (historique)** : migration `20260917120000_apprenant.sql`, `server/utils/zoom.ts`, `app/composables/useZoom.ts`, `@zoom/meetingsdk` installé, API mon-espace (index, module, sessions 6 états, liste-attente, certificats identité, coaching-prive accepter/proposer/sujets, session/[id] + prive-), layout espace + barre d'onglets, pages index/module/modules/sessions/certificats/coaching-prive/profil/parametres/session/hors-ligne, `ModaleSuppressionCompte`, `BandeauPwa`, store achat séance privée, paiement.vue séance.
- **Bug en cours** : toutes les pages renvoient 500 `getActivePinia()` depuis `app/app.vue:25` (`useAuthStore()` dans setup) — apparu après le lot B ; suspect : `app/stores/achat.ts` réécrit ou HMR pinia cassé → redémarrer `npm run dev` d'abord ; sinon comparer avec `git stash`.
- Restait pour B : vérifier les écrans en navigateur, `npm run db:sql` fait, commit « Planche B : fidélité 1:1, Zoom, suppression différée, PWA ».

**À faire ensuite** : Lot C (back-office : Phase, Annonce, éditeur module avec upload vidéo R2 multipart + `scripts/encoder-file-attente.mjs`, prévisualisation, CMS typé, formateurs (bouton Supprimer inerte), apprenants ajout/révocation, CSV, paramètres 4 onglets, référencement, sessions, coaching privé heures/Zoom/Agenda, accès, login, performances 5 onglets). Détails dans le fichier de plan.

**Contexte utile** : dev server de l'utilisateur sur :3000 sans `SUPABASE_URL` dans `.env` → pages de données en 404/500, seules pages statiques vérifiables. Migrations à appliquer sur la base distante via `supabase/en-ligne/09-…`, `10-…`, `11-…`. `npm run db:seed:generer` exige `--experimental-strip-types` (corrigé dans package.json). `pnpm-lock.yaml` untracked à ignorer. Deux erreurs typecheck préexistantes (lecteur vidéo, HTMLVideoElement) à ignorer. Le bundle `.nuxt/dev/index.mjs` se corrompt parfois sur builds Nitro concurrents : `touch` un fichier serveur.

**How to apply :** reprendre par le bug Pinia, commit B, puis D, puis C, un commit par lot ; relire le fichier de plan avant chaque lot.
