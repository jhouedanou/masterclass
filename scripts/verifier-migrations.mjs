/**
 * Rejoue les migrations et le seed sur un PostgreSQL réel, puis vérifie les
 * règles métier portées par la base.
 *
 *   npm run db:verifier
 *
 * Le moteur est PGlite : un PostgreSQL compilé en WebAssembly, exécuté dans le
 * processus Node. Ni Docker ni la CLI Supabase ne sont nécessaires, ce qui rend
 * cette vérification praticable partout, y compris en intégration continue.
 *
 * Elle ne remplace pas `supabase db reset`, qui seul valide le chemin réel de
 * la CLI, mais elle attrape tout ce qui relève du SQL lui-même.
 */
import { PGlite } from '@electric-sql/pglite'
import * as donnees from '../server/data/db.ts'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')

let reussis = 0
let echoues = 0

function succes(message) {
  console.log(`  \x1b[32m✓\x1b[0m ${message}`)
  reussis++
}

function echec(message) {
  console.log(`  \x1b[31m✗\x1b[0m ${message}`)
  echoues++
}

const db = new PGlite()

// Rôles fournis par la plateforme Supabase, absents d'un PostgreSQL nu.
await db.exec(`
  create role anon nologin noinherit;
  create role authenticated nologin noinherit;
  create role service_role nologin noinherit bypassrls;
`)

console.log('\nMigrations')
const dossier = join(RACINE, 'supabase/migrations')
for (const fichier of readdirSync(dossier).sort()) {
  try {
    await db.exec(readFileSync(join(dossier, fichier), 'utf8'))
    succes(fichier)
  } catch (erreur) {
    echec(`${fichier} — ${erreur.message}`)
    process.exit(1)
  }
}

console.log('\nJeu de données')
try {
  await db.exec(readFileSync(join(RACINE, 'supabase/seed.sql'), 'utf8'))
  succes('seed.sql appliqué')
} catch (erreur) {
  echec(`seed.sql — ${erreur.message}`)
  process.exit(1)
}

/**
 * Comptes attendus, lus dans la source du jeu de données plutôt que saisis.
 *
 * Écrits à la main, ils dérivaient à chaque ajout éditorial : un chapitre de
 * plus et le contrôle échouait sans que rien ne soit cassé, jusqu'à ce que le
 * bruit fasse ignorer un échec qui, lui, comptait. Ce qu'on veut vérifier n'a
 * jamais été « soixante-douze chapitres », mais « le seed a tout porté ».
 */
const ATTENDUS = {
  programmes: donnees.programmes.length,
  phases: donnees.phases.length,
  thematiques: donnees.thematiques.length,
  formateurs: donnees.formateurs.length,
  modules: donnees.modules.length,
  chapitres: donnees.modules.flatMap((m) => m.chapitres).length,
  utilisateurs: donnees.utilisateurs.length,
  acces: donnees.acces.length,
  sessions_coaching: donnees.sessionsCoaching.length,
  articles: donnees.articles.length,
  demandes_coaching_prive: donnees.demandesCoachingPrive.length,
  historique_coaching_prive: donnees.historiqueCoachingPrive.length,
  // Deux tables de réglages à ligne unique : le nombre est la règle, pas une
  // donnée éditoriale.
  reglages_financiers: 1,
  reglages_seo: 1,
}
for (const [table, attendu] of Object.entries(ATTENDUS)) {
  const { rows } = await db.query(`select count(*)::int as n from ${table}`)
  if (rows[0].n === attendu) succes(`${table} — ${attendu} lignes`)
  else echec(`${table} — ${rows[0].n} lignes, ${attendu} attendues`)
}

/**
 * Les deux chemins d'installation — migrations puis seed d'un côté, fichiers de
 * `supabase/en-ligne` de l'autre — doivent aboutir au même contenu. On compare
 * donc les deux bases l'une à l'autre plutôt que chacune à des nombres écrits
 * ici, qui ne disaient rien de l'égalité cherchée et vieillissaient au premier
 * chapitre ajouté.
 *
 * Le relevé se prend maintenant, avant que les assertions d'erreur qui suivent
 * ne laissent des transactions avortées derrière elles.
 */
const COMPTAGE = `select (select count(*) from modules)::int    as modules,
                         (select count(*) from chapitres)::int  as chapitres,
                         (select count(*) from articles)::int   as articles,
                         (select count(*) from formateurs)::int as formateurs`

const { rows: parMigrations } = await db.query(COMPTAGE)

// --- Aides d'assertion -----------------------------------------------------

async function attendErreur(nom, codeAttendu, sql) {
  try {
    await db.query(sql)
    echec(`${nom} — aucune erreur levée, ${codeAttendu} attendu`)
  } catch (erreur) {
    const code = erreur.code ?? erreur.sqlState ?? erreur.cause?.code
    if (code === codeAttendu) succes(`${nom} → ${code}`)
    else echec(`${nom} — ${codeAttendu} attendu, ${code} reçu`)
  }
}

async function attendValeur(nom, attendu, sql) {
  const { rows } = await db.query(sql)
  const valeur = Object.values(rows[0])[0]
  if (String(valeur) === String(attendu)) succes(`${nom} = ${valeur}`)
  else echec(`${nom} — ${attendu} attendu, ${valeur} reçu`)
}

// --- Réservation d'une place de coaching ------------------------------------

console.log('\nreserver_place_session')
await attendValeur(
  'compteur d’inscrits préservé par le seed',
  19,
  `select inscrits from sessions_coaching where id = 'ses-002'`,
)
await attendErreur(
  'réponses vides',
  'EM422',
  `select reserver_place_session('ses-002', 'usr-moussa', '  ', 'x', 'M.')`,
)
await attendErreur(
  'session inconnue',
  'EM404',
  `select reserver_place_session('ses-999', 'usr-moussa', 'a', 'b', 'M.')`,
)
await attendErreur(
  'fiche apprenant incomplète',
  'EM403',
  `select reserver_place_session('ses-002', 'usr-fatou', 'a', 'b', 'F.')`,
)
await attendErreur(
  'aucun module de la thématique',
  'EM403',
  `select reserver_place_session('ses-001', 'usr-moussa', 'a', 'b', 'M.')`,
)
await attendErreur(
  'déjà inscrit',
  'EM409',
  `select reserver_place_session('ses-002', 'usr-aya', 'a', 'b', 'A.')`,
)

await db.query(
  `insert into acces (utilisateur_id, module_id)
   select 'usr-moussa', id from modules where thematique_id = 'th-ent-fondations' limit 1`,
)
await attendValeur(
  'réservation acceptée',
  19,
  `select reserver_place_session('ses-001', 'usr-moussa', 'Mes relances', 'Des repères', 'Moussa D.')`,
)
await attendValeur(
  'compteur incrémenté par le déclencheur',
  19,
  `select inscrits from sessions_coaching where id = 'ses-001'`,
)
await attendValeur(
  'sujet transmis au formateur',
  1,
  `select count(*)::int from sujets_sessions where session_id = 'ses-001'`,
)

await db.query(`update sessions_coaching set places = inscrits where id = 'ses-003'`)
await db.query(
  `insert into acces (utilisateur_id, module_id)
   select 'usr-fatou', id from modules where thematique_id = 'th-sm-fondations' limit 1`,
)
await db.query(`update utilisateurs set fiche_completee = true where id = 'usr-fatou'`)
await attendErreur(
  'session complète',
  'EM409',
  `select reserver_place_session('ses-003', 'usr-fatou', 'a', 'b', 'F.')`,
)

// --- Délivrance d'un certificat ---------------------------------------------

console.log('\ndelivrer_certificat')
await attendValeur(
  'certificat existant renvoyé tel quel',
  'EMBF-ENT-2026-000128',
  `select (delivrer_certificat('usr-aya', 'mod-fixer-le-juste-prix-de-ses-produits-et-services')).numero`,
)
await attendErreur(
  'module non réalisé',
  'EM409',
  `select delivrer_certificat('usr-aya', 'mod-accroches-qui-stoppent-le-scroll-et-ia-copywriting')`,
)
await db.query(
  `update acces set progression = 100, termine_le = '2026-10-20'
   where utilisateur_id = 'usr-aya'
     and module_id = 'mod-accroches-qui-stoppent-le-scroll-et-ia-copywriting'`,
)
await attendValeur(
  'numéro tiré de la séquence',
  'EMBF-SOM-2026-000129',
  `select (delivrer_certificat('usr-aya', 'mod-accroches-qui-stoppent-le-scroll-et-ia-copywriting')).numero`,
)

// --- Attribution d'un accès gratuit -----------------------------------------

console.log('\nattribuer_acces')
await attendErreur(
  'motif absent',
  'EM422',
  `select attribuer_acces('usr-fatou', 'mod-linkedin-algorithme-et-optimisation-du-profil', '   ', 'Admin')`,
)
await attendErreur(
  'apprenant inconnu',
  'EM404',
  `select attribuer_acces('usr-inconnu', 'mod-linkedin-algorithme-et-optimisation-du-profil', 'lot', 'Admin')`,
)
await db.query(
  `select attribuer_acces('usr-fatou', 'mod-linkedin-algorithme-et-optimisation-du-profil', 'lot concours', 'Fatou Diarra')`,
)
await attendValeur(
  'accès ouvert',
  1,
  `select count(*)::int from acces
    where utilisateur_id = 'usr-fatou' and module_id = 'mod-linkedin-algorithme-et-optimisation-du-profil'`,
)
await attendValeur(
  'action journalisée dans la même transaction',
  1,
  `select count(*)::int from journal
    where action = 'a attribué un accès gratuit' and cible like 'Fatou Bamba%lot concours%'`,
)
await attendErreur(
  'accès déjà détenu',
  'EM409',
  `select attribuer_acces('usr-fatou', 'mod-linkedin-algorithme-et-optimisation-du-profil', 'encore', 'Admin')`,
)

// --- Relevé du temps visionné ------------------------------------------------

console.log('\nenregistrer_visionnage')
const CH = (position) =>
  `(select id from chapitres where module_id = 'mod-accroches-qui-stoppent-le-scroll-et-ia-copywriting' and position = ${position})`

await attendErreur(
  'module non acquis',
  'EM403',
  `select enregistrer_visionnage('usr-moussa', ${CH(0)}, 10)`,
)
await attendErreur(
  'chapitre inconnu',
  'EM404',
  `select enregistrer_visionnage('usr-aya', '00000000-0000-0000-0000-000000000000', 10)`,
)
await attendErreur(
  'temps négatif',
  'EM422',
  `select enregistrer_visionnage('usr-aya', ${CH(0)}, -5)`,
)

// Deux chapitres portent une vidéo de 31 s : la moitié du module vue donne 50 %.
await attendValeur(
  'premier chapitre vu en entier → 50 %',
  50,
  `select enregistrer_visionnage('usr-aya', ${CH(0)}, 31)`,
)
await attendValeur(
  'second chapitre vu à moitié → 74 %',
  74,
  `select enregistrer_visionnage('usr-aya', ${CH(1)}, 15)`,
)
await attendValeur(
  'un relevé plus bas ne fait pas reculer',
  74,
  `select enregistrer_visionnage('usr-aya', ${CH(1)}, 2)`,
)
await attendValeur(
  'temps conservé, pas écrasé',
  15,
  `select secondes_vues from visionnages where utilisateur_id = 'usr-aya' and chapitre_id = ${CH(1)}`,
)
await attendValeur(
  'temps plafonné à la durée du chapitre',
  100,
  `select enregistrer_visionnage('usr-aya', ${CH(1)}, 9999)`,
)

// --- Contraintes et déclencheurs --------------------------------------------

console.log('\nContraintes')
await attendErreur(
  'répartition différente de 100 %',
  '23514',
  `update reglages_financiers set part_formateur_pourcent = 40`,
)
await attendErreur(
  'progression hors bornes',
  '23514',
  `update acces set progression = 120
    where utilisateur_id = 'usr-aya'
      and module_id = 'mod-accroches-qui-stoppent-le-scroll-et-ia-copywriting'`,
)
await attendErreur(
  'plus de présents que d’inscrits',
  '23514',
  `update sessions_coaching set presents = places + 1 where id = 'ses-002'`,
)
await attendErreur(
  'deux sessions même thématique et même date',
  '23505',
  `insert into sessions_coaching (thematique_id, programme, formateur_id, date_seance, heure)
   values ('th-sm-copywriting', 'social-media', 'for-othniel', '2026-09-19', '20:00')`,
)
await attendErreur(
  'e-mail en doublon, casse ignorée',
  '23505',
  `insert into utilisateurs (prenom, nom, email) values ('Test', 'Doublon', 'AYA@example.ci')`,
)
await attendErreur(
  'compte non formateur rattaché à une fiche',
  '23514',
  `update utilisateurs set formateur_id = 'for-othniel' where id = 'usr-aya'`,
)

const avant = (
  await db.query(`select maj_le from modules where id = 'mod-linkedin-algorithme-et-optimisation-du-profil'`)
).rows[0].maj_le
await db.query(`update modules set titre = titre where id = 'mod-linkedin-algorithme-et-optimisation-du-profil'`)
const apres = (
  await db.query(`select maj_le from modules where id = 'mod-linkedin-algorithme-et-optimisation-du-profil'`)
).rows[0].maj_le
if (+apres > +avant) succes('maj_le rafraîchi à la mise à jour')
else echec('maj_le inchangé après une mise à jour')

console.log('\nIdentifiants générés')
const session = await db.query(
  `insert into sessions_coaching (thematique_id, programme, formateur_id, date_seance, heure)
   values ('th-sm-plateformes', 'social-media', 'for-othniel', '2026-11-05', '18:00')
   returning id`,
)
// Les séquences ne se rembobinent pas : l'insertion en conflit plus haut a
// consommé une valeur, des trous dans la numérotation sont normaux.
if (/^ses-\d{3}$/.test(session.rows[0].id)) succes(`session ${session.rows[0].id}`)
else echec(`identifiant de session inattendu : ${session.rows[0].id}`)

const compte = await db.query(
  `insert into utilisateurs (prenom, nom, email) values ('Nouvel', 'Inscrit', 'nouvel@example.ci')
   returning id`,
)
if (/^usr-[0-9a-f]{6}$/.test(compte.rows[0].id)) succes(`compte ${compte.rows[0].id}`)
else echec(`identifiant de compte inattendu : ${compte.rows[0].id}`)

// --- Planche B : Zoom, séance privée payée, identité du certificat ------------

console.log('\nEspace apprenant (migration 11)')
// Aucun compteur de lignes ne bouge avec cette migration : sans ces assertions,
// retirer une de ses colonnes passerait inaperçu.
await attendValeur(
  'colonnes de la migration 11 posées',
  11,
  `select count(*)::int from information_schema.columns
    where (table_name, column_name) in (
      ('sessions_coaching', 'zoom_reunion_id'),
      ('sessions_coaching', 'zoom_mot_de_passe'),
      ('sessions_coaching', 'zoom_lien_participation'),
      ('sessions_coaching', 'zoom_lien_hote'),
      ('demandes_coaching_prive', 'zoom_reunion_id'),
      ('demandes_coaching_prive', 'zoom_mot_de_passe'),
      ('demandes_coaching_prive', 'evenement_agenda_id'),
      ('demandes_coaching_prive', 'montant_fcfa'),
      ('inscriptions_sessions', 'present'),
      ('commandes', 'demande_coaching_id'),
      ('certificats', 'prenom_nom_confirme_le')
    )`,
)
await attendValeur(
  'les 8 statuts de coaching privé de la maquette',
  8,
  `select count(*)::int from pg_enum e
     join pg_type t on t.oid = e.enumtypid
    where t.typname = 'statut_coaching_prive'
      and e.enumlabel in ('en-attente', 'en-etude', 'confirmee-attente-paiement',
                          'payee', 'realisee', 'refusee', 'annulee', 'expiree')`,
)

// Les deux valeurs ajoutées doivent être utilisables, créneau proposé compris.
await db.query(
  `update demandes_coaching_prive set statut = 'en-etude' where id = 'dcp-001'`,
)
await db.query(
  `update demandes_coaching_prive set statut = 'confirmee-attente-paiement', montant_fcfa = 100000
    where id = 'dcp-001'`,
)
await attendValeur(
  'montant du créneau proposé',
  100000,
  `select montant_fcfa from demandes_coaching_prive where id = 'dcp-001'`,
)
await db.query(`update demandes_coaching_prive set statut = 'expiree' where id = 'dcp-001'`)
await attendValeur(
  'statut « expiree » accepté',
  'expiree',
  `select statut from demandes_coaching_prive where id = 'dcp-001'`,
)

await attendErreur(
  'commande rattachée à une séance inconnue',
  '23503',
  `insert into commandes (reference, utilisateur_id, total, moyen, demande_coaching_id)
   values ('FP-TEST-0001', 'usr-aya', 100000, 'wave', 'dcp-999')`,
)

// « Accepter et payer » : la commande règle une séance, et la suppression de la
// séance laisse la commande en place (on delete set null).
await db.query(
  `insert into demandes_coaching_prive
     (id, utilisateur_id, apprenant, module_id, formateur_id, besoins, disponibilites, creneaux, heures)
   values ('dcp-900', 'usr-aya', 'Awa Koné', 'mod-linkedin-algorithme-et-optimisation-du-profil', 'for-waffo',
           'Test', 'Test', '[]'::jsonb, 2)`,
)
await db.query(
  `insert into commandes (reference, utilisateur_id, total, moyen, demande_coaching_id)
   values ('FP-TEST-0002', 'usr-aya', 100000, 'wave', 'dcp-900')`,
)
await db.query(`delete from demandes_coaching_prive where id = 'dcp-900'`)
await attendValeur(
  'commande conservée après suppression de la séance',
  1,
  `select count(*)::int from commandes
    where reference = 'FP-TEST-0002' and demande_coaching_id is null`,
)

await db.query(
  `update certificats set prenom_nom_confirme_le = now()
    where numero = 'EMBF-ENT-2026-000128'`,
)
await attendValeur(
  'identité confirmée avant délivrance',
  1,
  `select count(*)::int from certificats where prenom_nom_confirme_le is not null`,
)

// --- Planche D : profil formateur, sujets lus, agenda -------------------------

console.log('\nEspace formateur (migration 12)')
await attendValeur(
  'colonnes de la migration 12 posées',
  6,
  `select count(*)::int from information_schema.columns
    where (table_name, column_name) in (
      ('formateurs', 'email_pro'),
      ('formateurs', 'whatsapp'),
      ('formateurs', 'activation_coaching_demandee_le'),
      ('sujets_sessions', 'lu_le'),
      ('sessions_coaching', 'evenement_agenda_id'),
      ('demandes_coaching_prive', 'evenement_agenda_id')
    )`,
)

// Les coordonnées internes valent la chaîne vide, jamais NULL : les écrans les
// affichent sans garde-fou.
await attendValeur(
  'coordonnées du formateur jamais nulles',
  0,
  `select count(*)::int from formateurs where email_pro is null or whatsapp is null`,
)

// « Sujets à lire avant le 10/09 » : le compteur repose sur lu_le à NULL.
await attendValeur(
  'sujets non lus avant ouverture de la liste',
  2,
  `select count(*)::int from sujets_sessions where session_id = 'ses-002' and lu_le is null`,
)
await db.query(`update sujets_sessions set lu_le = now() where session_id = 'ses-002' and lu_le is null`)
await attendValeur(
  'liste ouverte : plus aucun sujet à lire',
  0,
  `select count(*)::int from sujets_sessions where session_id = 'ses-002' and lu_le is null`,
)

await db.query(
  `update formateurs set activation_coaching_demandee_le = now() where id = 'for-declercq'`,
)
await attendValeur(
  'demande d’activation du coaching privé horodatée',
  1,
  `select count(*)::int from formateurs
    where activation_coaching_demandee_le is not null and coaching_prive_actif = false`,
)

// --- Vérification publique des attestations (migration 13) -------------------

console.log('\nVérification publique des attestations (migration 13)')
await attendValeur(
  'colonnes de la migration 13 posées',
  2,
  `select count(*)::int from information_schema.columns
    where (table_name, column_name) in (
      ('certificats', 'revoque_le'),
      ('certificats', 'motif_revocation')
    )`,
)
await attendValeur(
  'table de comptage des vérifications en place',
  1,
  `select count(*)::int from information_schema.tables where table_name = 'tentatives_verification'`,
)
// L'index porte la fenêtre glissante : sans lui, chaque vérification balaierait
// la table entière.
await attendValeur(
  'index (ip, cree_le) posé sur les consultations',
  1,
  `select count(*)::int from pg_indexes
    where tablename = 'tentatives_verification' and indexname = 'tentatives_verification_ip_idx'`,
)

// Une attestation délivrée est valable tant qu'elle n'est pas révoquée.
await attendValeur(
  'attestation du seed non révoquée',
  0,
  `select count(*)::int from certificats where revoque_le is not null`,
)
await db.query(
  `update certificats set revoque_le = now(), motif_revocation = 'identité usurpée'
    where numero = 'EMBF-ENT-2026-000128'`,
)
await attendValeur(
  'attestation révoquée avec son motif',
  1,
  `select count(*)::int from certificats
    where numero = 'EMBF-ENT-2026-000128' and revoque_le is not null and motif_revocation = 'identité usurpée'`,
)
// Le rétablissement efface les deux colonnes ensemble : un motif orphelin
// laisserait croire à une révocation toujours active.
await db.query(
  `update certificats set revoque_le = null, motif_revocation = null
    where numero = 'EMBF-ENT-2026-000128'`,
)
await attendValeur(
  'rétablissement : plus de révocation ni de motif',
  1,
  `select count(*)::int from certificats
    where numero = 'EMBF-ENT-2026-000128' and revoque_le is null and motif_revocation is null`,
)

// Le comptage distingue les numéros manqués des consultations abouties : c'est
// ce qui permet de bloquer un balayage sans pénaliser un employeur qui
// contrôle plusieurs attestations d'affilée.
await db.query(
  `insert into tentatives_verification (ip, numero, trouve)
   select '198.51.100.7', 'EMBF-ENT-2026-90000' || g, false from generate_series(0, 9) g`,
)
await db.query(
  `insert into tentatives_verification (ip, numero, trouve)
   values ('198.51.100.8', 'EMBF-ENT-2026-000128', true)`,
)
await attendValeur(
  'balayage repéré sur la fenêtre de 10 minutes',
  10,
  `select count(*)::int from tentatives_verification
    where ip = '198.51.100.7' and not trouve and cree_le > now() - interval '10 minutes'`,
)
await attendValeur(
  'une autre adresse n’est pas pénalisée',
  0,
  `select count(*)::int from tentatives_verification
    where ip = '198.51.100.8' and not trouve and cree_le > now() - interval '10 minutes'`,
)

// --- Authentification --------------------------------------------------------

console.log('\nBack-office (migration 23)')
await attendValeur(
  'colonnes de la migration 23 posées',
  3,
  `select count(*)::int from information_schema.columns
    where (table_name, column_name) in (
      ('programmes', 'statut'),
      ('modules', 'pret_le'),
      ('thematiques', 'position')
    )`,
)
// « Prêt » doit rester orthogonal au statut commercial : un module peut être
// filmé et relu sans être en vente, et inversement. Une valeur d'énumération
// n'aurait pas su l'exprimer.
await attendValeur(
  'un module se déclare prêt sans passer en vente',
  'ok',
  `with avant as (
     select id, statut from modules where statut <> 'disponible' order by id limit 1
   ),
   pose as (
     update modules m set pret_le = now()
       from avant a where m.id = a.id
      returning m.id, m.statut, m.pret_le
   )
   select case
            when pose.pret_le is not null and pose.statut = avant.statut then 'ok'
            else format('%s -> %s', avant.statut, pose.statut)
          end
     from pose join avant on avant.id = pose.id`,
)
// L'ordre d'affichage est distinct du numéro montré à l'apprenant : sans cela,
// deux thématiques ne pouvaient pas échanger leur place sans collision.
await attendValeur(
  'deux thématiques échangent leur ordre sans toucher à leur numéro',
  '1|0',
  `with echange as (
     update thematiques set position = case id
              when 'th-sm-fondations' then 1
              when 'th-sm-copywriting' then 0
            end
      where id in ('th-sm-fondations', 'th-sm-copywriting')
      returning id, numero, position
   )
   select string_agg(position::text, '|' order by numero) from echange`,
)
await attendValeur(
  'leurs numéros publics sont restés intacts',
  '1|2',
  `select string_agg(numero::text, '|' order by numero)
     from thematiques where id in ('th-sm-fondations', 'th-sm-copywriting')`,
)

console.log('\nTéléversement vidéo (migration 24)')
await attendValeur(
  'colonnes de la migration 24 posées',
  9,
  `select count(*)::int from information_schema.columns
    where (table_name, column_name) in (
      ('chapitres', 'video_format'),
      ('chapitres', 'video_nom_fichier'),
      ('chapitres', 'video_taille_octets'),
      ('chapitres', 'video_importee_le'),
      ('chapitres', 'script_format'),
      ('chapitres', 'script_nom_fichier'),
      ('chapitres', 'script_importe_le'),
      ('modules', 'telechargement_bloque'),
      ('modules', 'filigrane_actif')
    )`,
)
// Les deux vidéos de démonstration sont des flux HLS : le lecteur doit
// continuer de les lire pendant que les nouvelles arrivent en fichier unique.
await attendValeur(
  'les vidéos existantes sont marquées HLS',
  2,
  `select count(*)::int from chapitres where video_cle is not null and video_format = 'hls'`,
)
// Une clé sans format serait illisible : le lecteur ne saurait pas quoi
// demander au diffuseur.
await attendErreur(
  'une clé vidéo sans format est refusée',
  '23514',
  `update chapitres set video_cle = 'sans-format-test', video_format = null
    where id = (select id from chapitres where video_cle is null limit 1)`,
)
await attendErreur(
  'un format de vidéo inconnu est refusé',
  '23514',
  `update chapitres set video_cle = 'format-inconnu-test', video_format = 'mp4'
    where id = (select id from chapitres where video_cle is null limit 1)`,
)
// Deux dépôts concurrents laisseraient un téléversement orphelin, facturé
// sans que rien ne le montre.
await db.query(
  `insert into televersements_video (chapitre_id, cle, upload_id, nom_fichier, taille_octets, taille_part_octets, nb_parts)
   select id, 'cle-a', 'up-a', 'a.mp4', 1000, 16777216, 1 from chapitres order by id limit 1`,
)
await attendErreur(
  'deux téléversements vivants pour un même chapitre sont refusés',
  '23505',
  `insert into televersements_video (chapitre_id, cle, upload_id, nom_fichier, taille_octets, taille_part_octets, nb_parts)
   select id, 'cle-b', 'up-b', 'b.mp4', 1000, 16777216, 1 from chapitres order by id limit 1`,
)
// Abandonné, il libère la place : c'est ce que fait la purge quotidienne.
await db.query(`update televersements_video set statut = 'abandonne' where upload_id = 'up-a'`)
await attendValeur(
  'un dépôt abandonné libère la place pour un nouveau',
  1,
  `with pose as (
     insert into televersements_video (chapitre_id, cle, upload_id, nom_fichier, taille_octets, taille_part_octets, nb_parts)
     select id, 'cle-d', 'up-d', 'd.mp4', 1000, 16777216, 1 from chapitres order by id limit 1
     returning 1
   )
   select count(*)::int from pose`,
)
// Le stockage d'objets impose des parts d'au moins cinq mégaoctets.
await attendErreur(
  'une taille de part sous le seuil du stockage est refusée',
  '23514',
  `insert into televersements_video (chapitre_id, cle, upload_id, nom_fichier, taille_octets, taille_part_octets, nb_parts)
   select id, 'cle-c', 'up-c', 'c.mp4', 1000, 1024, 1 from chapitres order by id offset 1 limit 1`,
)

console.log('\nAuthentification')
await attendValeur(
  'empreintes de mot de passe posées (jamais en clair)',
  9,
  `select count(*)::int from utilisateurs where mot_de_passe_hache like 'scrypt$%'`,
)
await attendValeur(
  'sels distincts d’un compte à l’autre',
  9,
  `select count(distinct split_part(mot_de_passe_hache, '$', 5))::int from utilisateurs`,
)
await attendValeur(
  'droits fins de l’éditeur',
  11,
  `select array_length(sections_autorisees, 1) from utilisateurs where id = 'usr-editeur'`,
)
await attendValeur(
  'transactions hors des droits de l’éditeur',
  'false',
  `select 'transactions-paiements' = any(sections_autorisees) from utilisateurs where id = 'usr-editeur'`,
)

// Quatre échecs ne verrouillent pas ; le cinquième oui.
for (let i = 0; i < 4; i++) {
  await db.query(`select enregistrer_tentative_connexion('aya@example.ci', '10.0.0.1', 'test', false)`)
}
await attendValeur(
  'compte encore ouvert après 4 échecs',
  'null',
  `select coalesce(verrouille_jusqu_a::text, 'null') from utilisateurs where id = 'usr-aya'`,
)
await attendValeur(
  'verrouillage au 5ᵉ échec',
  'true',
  `select enregistrer_tentative_connexion('aya@example.ci', '10.0.0.1', 'test', false) is not null`,
)
await attendValeur(
  'alerte portée au journal',
  1,
  `select count(*)::int from journal where action like 'a verrouillé un compte%'`,
)
await db.query(`select enregistrer_tentative_connexion('aya@example.ci', '10.0.0.1', 'test', true)`)
await attendValeur(
  'connexion réussie : verrou levé',
  'null',
  `select coalesce(verrouille_jusqu_a::text, 'null') from utilisateurs where id = 'usr-aya'`,
)
await attendValeur(
  'dernière connexion horodatée',
  'true',
  `select derniere_connexion_le is not null from utilisateurs where id = 'usr-aya'`,
)
await attendValeur(
  'tentatives journalisées avec IP et appareil',
  6,
  `select count(*)::int from connexions where email = 'aya@example.ci' and ip = '10.0.0.1'`,
)
await db.query(`select enregistrer_tentative_connexion('inconnu@example.ci', null, null, false)`)
await attendValeur(
  'adresse inconnue tracée sans compte rattaché',
  1,
  `select count(*)::int from connexions
    where email = 'inconnu@example.ci' and utilisateur_id is null`,
)

await db.close()

// --- Fichiers d'installation pour le Supabase hébergé ------------------------
//
// Ce sont eux que l'on colle dans SQL Editor : on rejoue les deux dans l'ordre
// sur une base vierge, pour garantir que le chemin sans CLI marche aussi.

console.log('\nInstallation en ligne (supabase/en-ligne)')
const enLigne = new PGlite()
await enLigne.exec(`
  create role anon nologin noinherit;
  create role authenticated nologin noinherit;
  create role service_role nologin noinherit bypassrls;
`)

const fichiersEnLigne = readdirSync(join(RACINE, 'supabase/en-ligne'))
  .filter((f) => /^\d/.test(f))
  .sort()

// --- Correspondance avec les migrations --------------------------------------
//
// Rejouer ces fichiers prouve qu'ils tiennent debout ensemble, pas qu'ils
// disent la même chose que les migrations. Une migration ajoutée sans
// régénération passait donc inaperçue — et ne partait jamais en ligne. C'est
// arrivé : `debit_routes_publiques` n'a jamais eu de fichier, la table de
// comptage manque en production, et le plafond des routes publiques y est muet
// depuis, `limiterDebit` avalant l'erreur pour ne pas fermer les formulaires.
//
// La comparaison porte sur la ligne « source : » que l'en-tête généré écrit, et
// non sur les numéros : ceux-ci se décalent dès qu'une migration s'intercale.

const migrationsAttendues = readdirSync(join(RACINE, 'supabase/migrations'))
  .filter((f) => f.endsWith('.sql'))
  .sort()

const sourcesEnLigne = new Map()
for (const fichier of fichiersEnLigne) {
  if (fichier === '99-donnees.sql') continue
  const tete = readFileSync(join(RACINE, 'supabase/en-ligne', fichier), 'utf8').slice(0, 2000)
  const source = tete.match(/source\s*:\s*(\S+\.sql)/)?.[1]
  if (source) sourcesEnLigne.set(source, fichier)
  else echec(`${fichier} — en-tête sans « source : », impossible de le rattacher à une migration`)
}

for (const migration of migrationsAttendues) {
  if (sourcesEnLigne.has(migration)) continue
  echec(
    `${migration} n'a aucun fichier dans supabase/en-ligne — il ne partira jamais sur la base hébergée (npm run db:sql)`,
  )
}

for (const [source, fichier] of sourcesEnLigne) {
  if (migrationsAttendues.includes(source)) continue
  echec(`${fichier} cite ${source}, qui n'existe plus dans supabase/migrations`)
}

if (sourcesEnLigne.size === migrationsAttendues.length && sourcesEnLigne.size) {
  const manquant = migrationsAttendues.some((m) => !sourcesEnLigne.has(m))
  if (!manquant) succes(`${migrationsAttendues.length} migrations, autant de fichiers d'installation`)
}

for (const fichier of fichiersEnLigne) {
  const chemin = join(RACINE, 'supabase/en-ligne', fichier)
  try {
    await enLigne.exec(readFileSync(chemin, 'utf8'))
    succes(fichier)
  } catch (erreur) {
    echec(`${fichier} — ${erreur.message}`)
    break
  }
}

// Chemin d'une base installée avant la migration d'authentification : ses
// comptes n'ont pas de mot de passe. Le rattrapage doit les pourvoir sans
// jamais écraser un mot de passe déjà choisi.
await enLigne.query(`update utilisateurs set mot_de_passe_hache = null`)
await enLigne.query(
  `update utilisateurs set mot_de_passe_hache = 'scrypt$deja$choisi' where id = 'usr-aya'`,
)
await enLigne.exec(
  readFileSync(join(RACINE, 'supabase/en-ligne/rattrapage-mots-de-passe.sql'), 'utf8'),
)
const { rows: apresRattrapage } = await enLigne.query(
  `select count(*) filter (where mot_de_passe_hache like 'scrypt$16384$%')::int as pourvus,
          (select mot_de_passe_hache from utilisateurs where id = 'usr-aya') as aya
     from utilisateurs`,
)
if (apresRattrapage[0].pourvus === 8) succes('rattrapage : 8 comptes pourvus')
else echec(`rattrapage : ${apresRattrapage[0].pourvus} comptes pourvus, 8 attendus`)
if (apresRattrapage[0].aya === 'scrypt$deja$choisi') succes('rattrapage : mot de passe existant préservé')
else echec('rattrapage : un mot de passe existant a été écrasé')

const { rows: parInstallation } = await enLigne.query(COMPTAGE)

if (JSON.stringify(parMigrations[0]) === JSON.stringify(parInstallation[0])) {
  succes(`contenu identique à celui des migrations — ${JSON.stringify(parInstallation[0])}`)
} else {
  echec(
    `contenu divergent — migrations ${JSON.stringify(parMigrations[0])}, ` +
      `installation ${JSON.stringify(parInstallation[0])}`,
  )
}

await enLigne.close()

console.log(`\n${reussis} réussis, ${echoues} échoués\n`)
process.exit(echoues ? 1 : 0)
