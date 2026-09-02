/**
 * Envoie un flux transcodé vers le stockage d'objets.
 *
 *   npm run video:publier -- <cle>
 *   npm run video:publier -- --tout
 *
 * S'appuie sur wrangler, l'outil de Cloudflare, qui gère l'authentification.
 * Rien n'est envoyé deux fois : un fichier déjà présent est laissé tel quel,
 * sauf avec --forcer.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')
const HLS = join(RACINE, 'medias/hls')
const BUCKET = process.env.VIDEO_BUCKET || 'emasterclass-videos'

const arguments_ = process.argv.slice(2)
const forcer = arguments_.includes('--forcer')
const tout = arguments_.includes('--tout')
const cles = arguments_.filter((a) => !a.startsWith('--'))

if (!tout && cles.length === 0) {
  console.error('Usage : npm run video:publier -- <cle> [<cle>…]   ou   npm run video:publier -- --tout')
  process.exit(1)
}

if (!existsSync(HLS)) {
  console.error('Aucun flux transcodé. Lancer d’abord npm run video:transcoder.')
  process.exit(1)
}

const aPublier = tout
  ? readdirSync(HLS, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
  : cles

function fichiers(dossier) {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = join(dossier, entree.name)
    return entree.isDirectory() ? fichiers(chemin) : [chemin]
  })
}

let envoyes = 0
let octets = 0

for (const cle of aPublier) {
  const dossier = join(HLS, cle)
  if (!existsSync(dossier)) {
    console.error(`✗ ${cle} — dossier absent, transcodage à refaire`)
    process.exitCode = 1
    continue
  }

  const liste = fichiers(dossier)
  console.log(`\n${cle} — ${liste.length} fichiers`)

  for (const fichier of liste) {
    const distant = relative(HLS, fichier)
    const commande = ['r2', 'object', 'put', `${BUCKET}/${distant}`, '--file', fichier, '--remote']
    try {
      execFileSync('npx', ['wrangler', ...commande], { stdio: ['ignore', 'ignore', 'pipe'] })
      envoyes++
      octets += statSync(fichier).size
    } catch (erreur) {
      const details = String(erreur.stderr ?? '')
      if (!forcer && /already exists/i.test(details)) continue
      console.error(`✗ ${distant}\n  ${details.trim().split('\n').slice(-2).join(' ')}`)
      process.exitCode = 1
    }
  }
}

console.log(`\n✓ ${envoyes} fichiers envoyés (${(octets / 1024 / 1024).toFixed(1)} Mo) vers ${BUCKET}\n`)
