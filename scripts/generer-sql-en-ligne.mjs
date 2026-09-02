/**
 * Prépare les fichiers SQL à coller dans l'éditeur du projet Supabase hébergé.
 *
 *   npm run db:sql
 *
 * Un fichier par migration, numéroté dans l'ordre d'application, plus le jeu de
 * données. Une base neuve les exécute tous ; une base déjà installée n'exécute
 * que les fichiers dont le numéro lui manque.
 *
 * La CLI Supabase reste la voie recommandée (`npm run db:migrer`) : elle tient
 * le registre des migrations appliquées. Ces fichiers-ci servent quand la CLI
 * n'est pas disponible.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')
const SORTIE = join(RACINE, 'supabase', 'en-ligne')

// Le dossier est entièrement reconstruit : un fichier issu d'une migration
// renommée ou supprimée ne doit pas y survivre.
rmSync(SORTIE, { recursive: true, force: true })
mkdirSync(SORTIE, { recursive: true })

function entete(titre, lignes) {
  return [
    '-- ---------------------------------------------------------------------------',
    `-- ${titre}`,
    '--',
    '-- FICHIER GÉNÉRÉ : ne pas éditer à la main.',
    '-- Régénération : npm run db:sql',
    '--',
    ...lignes.map((l) => `-- ${l}`.trimEnd()),
    '-- ---------------------------------------------------------------------------',
    '',
    '',
  ].join('\n')
}

/** `20260828120000_schema_initial.sql` → `schema-initial`. */
function libelle(fichier) {
  return fichier.replace(/^\d+_/, '').replace(/\.sql$/, '').replace(/_/g, '-')
}

const dossierMigrations = join(RACINE, 'supabase/migrations')
const migrations = readdirSync(dossierMigrations).sort()
const produits = []

migrations.forEach((fichier, i) => {
  const numero = String(i + 1).padStart(2, '0')
  const nom = `${numero}-${libelle(fichier)}.sql`

  const contenu =
    entete(`E-Masterclass Big Five — ${libelle(fichier).replace(/-/g, ' ')}`, [
      `Migration ${i + 1} sur ${migrations.length} · source : ${fichier}`,
      '',
      "À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.",
      "Ces scripts ne sont pas rejouables : sur une base déjà installée,",
      "n'exécutez que les fichiers dont le numéro vous manque.",
    ]) + readFileSync(join(dossierMigrations, fichier), 'utf8').trimEnd()

  writeFileSync(join(SORTIE, nom), contenu + '\n', 'utf8')
  produits.push(nom)
})

// --- Jeu de données ---------------------------------------------------------

const seed = readFileSync(join(RACINE, 'supabase/seed.sql'), 'utf8')
// L'en-tête d'origine parle de `supabase db reset` : on lui substitue le mode
// d'emploi de l'éditeur SQL, le corps des instructions restant identique.
const corpsSeed = seed.slice(seed.indexOf('\n\n') + 2).trimStart()

const nomDonnees = '99-donnees.sql'
writeFileSync(
  join(SORTIE, nomDonnees),
  entete('E-Masterclass Big Five — jeu de données initial', [
    'À exécuter en dernier, sur une base neuve uniquement : le contenu',
    'éditorial (18 modules et leurs chapitres, fiches formateurs, articles),',
    'les comptes de démonstration et les réglages du back-office.',
    '',
    'Sur une base qui contient déjà ces données, ce fichier échouerait sur les',
    'clés primaires — c\'est voulu, il ne doit pas écraser du contenu existant.',
    '',
    'Source : server/data/db.ts — régénérer avec `npm run db:seed:generer`.',
  ]) + corpsSeed.trimEnd(),
  'utf8',
)
produits.push(nomDonnees)

// --- Rattrapage -------------------------------------------------------------

// Base installée avant la migration d'authentification : les comptes existants
// n'ont pas de mot de passe et ne peuvent plus se connecter.
// Rattrapages : correctifs à passer sur une base déjà installée, que le jeu de
// données ne peut plus atteindre puisqu'il ne se rejoue pas.
for (const nom of ['rattrapage-mots-de-passe.sql', 'rattrapage-videos.sql']) {
  const source = join(RACINE, 'supabase', nom)
  if (!existsSync(source)) continue
  writeFileSync(join(SORTIE, nom), readFileSync(source, 'utf8'), 'utf8')
  produits.push(nom)
}

const ko = (nom) => `${Math.round(readFileSync(join(SORTIE, nom), 'utf8').length / 1024)} ko`
for (const nom of produits) console.info(`supabase/en-ligne/${nom.padEnd(34)} ${ko(nom)}`)
