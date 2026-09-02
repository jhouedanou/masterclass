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

const ATTENDUS = {
  programmes: 2,
  thematiques: 6,
  formateurs: 7,
  modules: 18,
  chapitres: 72,
  utilisateurs: 6,
  acces: 2,
  sessions_coaching: 3,
  articles: 5,
  reglages_financiers: 1,
  reglages_seo: 1,
}
for (const [table, attendu] of Object.entries(ATTENDUS)) {
  const { rows } = await db.query(`select count(*)::int as n from ${table}`)
  if (rows[0].n === attendu) succes(`${table} — ${attendu} lignes`)
  else echec(`${table} — ${rows[0].n} lignes, ${attendu} attendues`)
}

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
  `select attribuer_acces('usr-fatou', 'mod-instagram-formats-et-croissance', '   ', 'Admin')`,
)
await attendErreur(
  'apprenant inconnu',
  'EM404',
  `select attribuer_acces('usr-inconnu', 'mod-instagram-formats-et-croissance', 'lot', 'Admin')`,
)
await db.query(
  `select attribuer_acces('usr-fatou', 'mod-instagram-formats-et-croissance', 'lot concours', 'Fatou Diarra')`,
)
await attendValeur(
  'accès ouvert',
  1,
  `select count(*)::int from acces
    where utilisateur_id = 'usr-fatou' and module_id = 'mod-instagram-formats-et-croissance'`,
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
  `select attribuer_acces('usr-fatou', 'mod-instagram-formats-et-croissance', 'encore', 'Admin')`,
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
  await db.query(`select maj_le from modules where id = 'mod-instagram-formats-et-croissance'`)
).rows[0].maj_le
await db.query(`update modules set titre = titre where id = 'mod-instagram-formats-et-croissance'`)
const apres = (
  await db.query(`select maj_le from modules where id = 'mod-instagram-formats-et-croissance'`)
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

// --- Authentification --------------------------------------------------------

console.log('\nAuthentification')
await attendValeur(
  'empreintes de mot de passe posées (jamais en clair)',
  6,
  `select count(*)::int from utilisateurs where mot_de_passe_hache like 'scrypt$%'`,
)
await attendValeur(
  'sels distincts d’un compte à l’autre',
  6,
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
if (apresRattrapage[0].pourvus === 5) succes('rattrapage : 5 comptes pourvus')
else echec(`rattrapage : ${apresRattrapage[0].pourvus} comptes pourvus, 5 attendus`)
if (apresRattrapage[0].aya === 'scrypt$deja$choisi') succes('rattrapage : mot de passe existant préservé')
else echec('rattrapage : un mot de passe existant a été écrasé')

const { rows: controle } = await enLigne.query(
  `select (select count(*) from modules)::int as modules,
          (select count(*) from chapitres)::int as chapitres,
          (select count(*) from articles)::int as articles`,
)
if (controle[0].modules === 18 && controle[0].chapitres === 72 && controle[0].articles === 5) {
  succes('contenu identique à celui des migrations')
} else {
  echec(`contenu divergent : ${JSON.stringify(controle[0])}`)
}

await enLigne.close()

console.log(`\n${reussis} réussis, ${echoues} échoués\n`)
process.exit(echoues ? 1 : 0)
