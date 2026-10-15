/**
 * Renouvelle les mots de passe des comptes de démonstration sur la base
 * désignée par `.env` (SUPABASE_URL + SUPABASE_SECRET_KEY).
 *
 *   npm run auth:renouveler                       # lecture seule : état des comptes
 *   npm run auth:renouveler -- --appliquer        # tire et enregistre de nouveaux mots de passe
 *   npm run auth:renouveler -- --appliquer --emails cossi@bigfiveabidjan.com
 *   npm run auth:renouveler -- --appliquer --tous # même les comptes déjà changés
 *
 * Le seed donne à tous les comptes de démonstration le même mot de passe,
 * longtemps publié dans le README : quiconque l'a lu ouvre le back-office
 * (recette du 15/10). Sans `--appliquer`, le script ne fait que lire et dire
 * quels comptes l'acceptent encore. Avec, il tire pour chacun un mot de passe
 * aléatoire, l'enregistre haché (scrypt, sel aléatoire) et l'imprime une
 * seule fois dans le terminal : le reporter dans un gestionnaire de mots de
 * passe, puis le transmettre à son titulaire, qui le changera depuis
 * « Paramètres ». Rien n'est écrit sur disque.
 *
 * Par défaut, un compte dont le mot de passe a déjà changé n'est pas touché.
 *
 * Les sessions ouvertes survivent au changement (cookie scellé, 7 à 30 jours) :
 * pour les fermer toutes, remplacer NUXT_SESSION_PASSWORD sur l'hébergement.
 */
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { hacherMotDePasse, verifierMotDePasse } from '../server/utils/motDePasse.ts'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')

const env: Record<string, string | undefined> = { ...process.env }
const fichierEnv = join(RACINE, '.env')
if (existsSync(fichierEnv)) {
  for (const ligne of readFileSync(fichierEnv, 'utf8').split('\n')) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m && !(m[1]! in env)) env[m[1]!] = m[2]!.replace(/^["']|["']$/g, '')
  }
}

const url = env.SUPABASE_URL ?? ''
const cle = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || ''
if (!url || !cle) {
  console.error('SUPABASE_URL et SUPABASE_SECRET_KEY sont requis dans .env.')
  process.exit(1)
}

/** Les comptes créés par le seed (voir scripts/generer-seed.ts). */
const COMPTES_DEMO = [
  'cossi@bigfiveabidjan.com',
  'jeanluc@bigfiveabidjan.com',
  'jeremie.declercq@bigfiveabidjan.com',
  'houefa@bigfiveabidjan.com',
  'editeur@bigfive.ci',
  'formateur@bigfive.ci',
  'aya@example.ci',
]

/** Le mot de passe commun du seed : il ne sert ici qu'à le reconnaître. */
const MOT_DE_PASSE_DEMO = 'Masterclass2026!'

const args = process.argv.slice(2)
const appliquer = args.includes('--appliquer')
const tous = args.includes('--tous')
const iEmails = args.indexOf('--emails')
const emails =
  iEmails === -1
    ? COMPTES_DEMO
    : (args[iEmails + 1] ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
if (!emails.length) {
  console.error('Usage : npm run auth:renouveler -- [--appliquer] [--tous] [--emails a@x,b@y]')
  process.exit(1)
}

/** 18 octets → 24 caractères base64url : bien au-delà des 10 exigés. */
function tirerMotDePasse(): string {
  return randomBytes(18).toString('base64url')
}

const supabase = createClient(url, cle, { auth: { persistSession: false } })
const hote = new URL(url).host

const { data: lignes, error } = await supabase
  .from('utilisateurs')
  .select('id, email, role, mot_de_passe_hache, mot_de_passe_maj_le')
  .in('email', emails)
if (error) {
  console.error(`Lecture impossible : ${error.message}`)
  process.exit(1)
}

console.log(`Base : ${hote}${appliquer ? '' : ' — lecture seule (ajouter --appliquer pour écrire)'}\n`)

const nouveaux: { email: string; motDePasse: string }[] = []
let echecs = 0

for (const email of emails) {
  const ligne = lignes?.find((l) => l.email.toLowerCase() === email)
  if (!ligne) {
    console.log(`  ${email.padEnd(38)} absent de la base`)
    continue
  }
  const demo = ligne.mot_de_passe_hache
    ? await verifierMotDePasse(MOT_DE_PASSE_DEMO, ligne.mot_de_passe_hache)
    : false
  const etat = !ligne.mot_de_passe_hache
    ? 'sans mot de passe'
    : demo
      ? 'MOT DE PASSE DE DÉMONSTRATION'
      : 'déjà changé'
  const cible = demo || tous || !ligne.mot_de_passe_hache

  if (!appliquer || !cible) {
    console.log(`  ${email.padEnd(38)} ${ligne.role.padEnd(16)} ${etat}${appliquer ? ' — laissé tel quel' : ''}`)
    continue
  }

  const motDePasse = tirerMotDePasse()
  const { error: e } = await supabase
    .from('utilisateurs')
    .update({
      mot_de_passe_hache: await hacherMotDePasse(motDePasse),
      verrouille_jusqu_a: null,
      mot_de_passe_maj_le: new Date().toISOString(),
    })
    .eq('id', ligne.id)
  if (e) {
    echecs++
    console.log(`  ${email.padEnd(38)} ÉCHEC : ${e.message}`)
    continue
  }
  // Relecture : l'écriture n'est tenue pour faite que si la base accepte le nouveau mot de passe.
  const { data: relu } = await supabase.from('utilisateurs').select('mot_de_passe_hache').eq('id', ligne.id).single()
  if (!relu?.mot_de_passe_hache || !(await verifierMotDePasse(motDePasse, relu.mot_de_passe_hache))) {
    echecs++
    console.log(`  ${email.padEnd(38)} ÉCHEC : la relecture ne retrouve pas le nouveau mot de passe`)
    continue
  }
  nouveaux.push({ email, motDePasse })
  console.log(`  ${email.padEnd(38)} ${ligne.role.padEnd(16)} renouvelé`)
}

if (nouveaux.length) {
  console.log('\nNouveaux mots de passe — affichés une seule fois, à reporter dans un gestionnaire :\n')
  for (const n of nouveaux) console.log(`  ${n.email.padEnd(38)} ${n.motDePasse}`)
  console.log('\nLes sessions déjà ouvertes restent valides : remplacer NUXT_SESSION_PASSWORD pour les fermer.')
}

process.exit(echecs ? 1 : 0)
