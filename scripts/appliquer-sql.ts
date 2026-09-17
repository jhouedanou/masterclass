/**
 * Exécute un fichier SQL sur le projet Supabase en ligne.
 *
 *   npm run db:appliquer -- supabase/rattrapage-contenus-reels.sql
 *   npm run db:appliquer -- --verifier "select count(*) from modules"
 *
 * Remplace le copier-coller dans le SQL Editor, dont le défaut est de ne rien
 * laisser derrière lui : un fichier entier dans une transaction qui échoue est
 * annulé en silence si personne ne lit la sortie. Ici le résultat est imprimé,
 * et le code de sortie vaut 1 en cas d'erreur.
 *
 * Lit `.env` : SUPABASE_URL (pour la référence du projet) et
 * SUPABASE_ACCESS_TOKEN, jeton personnel créé sur
 * supabase.com/dashboard/account/tokens. Ce jeton ne sert qu'ici, jamais à
 * l'application — qui, elle, passe par SUPABASE_SECRET_KEY.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')

const env: Record<string, string | undefined> = { ...process.env }
const fichierEnv = join(RACINE, '.env')
if (existsSync(fichierEnv)) {
  for (const ligne of readFileSync(fichierEnv, 'utf8').split('\n')) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m && !(m[1]! in env)) env[m[1]!] = m[2]!.replace(/^["']|["']$/g, '')
  }
}

const ref = (env.SUPABASE_URL ?? '').match(/https?:\/\/([a-z0-9]+)\.supabase\.co/)?.[1]
const jeton = env.SUPABASE_ACCESS_TOKEN
if (!ref || !jeton) {
  console.error(
    'SUPABASE_URL et SUPABASE_ACCESS_TOKEN sont requis dans .env.\n' +
      'Le jeton se crée sur https://supabase.com/dashboard/account/tokens',
  )
  process.exit(1)
}

const arguments_ = process.argv.slice(2)
const requeteDirecte = arguments_.indexOf('--verifier')
const sql =
  requeteDirecte === -1
    ? readFileSync(join(RACINE, arguments_[0] ?? ''), 'utf8')
    : arguments_[requeteDirecte + 1]

if (!sql) {
  console.error('Usage : npm run db:appliquer -- <fichier.sql>')
  process.exit(1)
}

const source = requeteDirecte === -1 ? arguments_[0] : 'requête directe'
console.log(`Projet   ${ref}`)
console.log(`Source   ${source}`)
console.log(`Taille   ${Math.round(sql.length / 1024)} ko\n`)

const reponse = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { authorization: `Bearer ${jeton}`, 'content-type': 'application/json' },
  body: JSON.stringify({ query: sql }),
})

const corps = await reponse.text()

if (!reponse.ok) {
  console.error(`✗ Échec (${reponse.status})\n`)
  // Le message de Postgres porte la ligne fautive : l'imprimer tel quel.
  try {
    console.error((JSON.parse(corps) as { message?: string }).message ?? corps)
  } catch {
    console.error(corps)
  }
  process.exit(1)
}

let resultat: unknown
try {
  resultat = JSON.parse(corps)
} catch {
  resultat = corps
}

console.log('✓ Exécuté')
if (Array.isArray(resultat) && resultat.length) console.log(JSON.stringify(resultat, null, 2))
