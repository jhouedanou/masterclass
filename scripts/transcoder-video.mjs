/**
 * Prépare une vidéo pour la diffusion : un fichier source devient un flux HLS
 * à plusieurs débits, prêt à être déposé sur le CDN.
 *
 *   node scripts/transcoder-video.mjs <source> <cle>
 *   npm run video:transcoder -- medias/sources/chapitre.mp4 mod-accroches-ch01
 *
 * « Plusieurs débits » est le point important : le lecteur choisit tout seul
 * la qualité que la connexion supporte. Sur une connexion mobile ivoirienne,
 * la lecture démarre en 240p et monte si elle peut, au lieu de s'interrompre.
 *
 * Le transcodage se fait une fois, sur un poste de travail. Le résultat est
 * un dossier de fichiers statiques : le servir ne demande plus aucun calcul,
 * d'où un hébergement à quelques euros par mois.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Paliers de qualité. Un palier plus haut que la source n'est pas produit :
 *  agrandir une image ne lui ajoute pas de détail, cela ne fait que du poids. */
const PALIERS = [
  { hauteur: 240, video: '400k', plafond: '600k', audio: '64k' },
  { hauteur: 360, video: '800k', plafond: '1200k', audio: '96k' },
  { hauteur: 480, video: '1400k', plafond: '2100k', audio: '128k' },
  { hauteur: 720, video: '2800k', plafond: '4200k', audio: '128k' },
]

const [source, cle] = process.argv.slice(2)

if (!source || !cle) {
  console.error('Usage : node scripts/transcoder-video.mjs <source> <cle>')
  console.error('Exemple : node scripts/transcoder-video.mjs medias/sources/ch01.mp4 mod-accroches-ch01')
  process.exit(1)
}

if (!/^[a-z0-9][a-z0-9-]{2,80}$/.test(cle)) {
  console.error(
    `Clé invalide : « ${cle} ». Minuscules, chiffres et tirets — elle devient un segment d'URL.`,
  )
  process.exit(1)
}

const cheminSource = resolve(RACINE, source)
if (!existsSync(cheminSource)) {
  console.error(`Fichier introuvable : ${cheminSource}`)
  process.exit(1)
}

function ffprobe(...args) {
  return execFileSync('ffprobe', ['-v', 'error', ...args, cheminSource], { encoding: 'utf8' }).trim()
}

let hauteurSource
let dureeSecondes
try {
  hauteurSource = Number(
    ffprobe('-select_streams', 'v:0', '-show_entries', 'stream=height', '-of', 'csv=p=0'),
  )
  dureeSecondes = Math.round(
    Number(ffprobe('-show_entries', 'format=duration', '-of', 'csv=p=0')),
  )
} catch {
  console.error('ffprobe indisponible. Installer ffmpeg : brew install ffmpeg')
  process.exit(1)
}

// Toujours au moins le palier le plus bas, même pour une source minuscule :
// un flux sans variante n'est pas lisible.
const paliers = PALIERS.filter((p) => p.hauteur <= hauteurSource)
if (paliers.length === 0) paliers.push(PALIERS[0])

const sortie = join(RACINE, 'medias/hls', cle)
mkdirSync(sortie, { recursive: true })

console.log(`\nSource   ${source}`)
console.log(`Clé      ${cle}`)
console.log(`Durée    ${Math.floor(dureeSecondes / 60)} min ${dureeSecondes % 60} s`)
console.log(`Paliers  ${paliers.map((p) => `${p.hauteur}p`).join(' · ')}\n`)

// Une seule passe ffmpeg produit toutes les variantes : la source n'est
// décodée qu'une fois, ce qui divise d'autant le temps de traitement.
const decoupage = `[0:v]split=${paliers.length}${paliers.map((_, i) => `[v${i}]`).join('')};${paliers
  .map((p, i) => `[v${i}]scale=-2:${p.hauteur}[v${i}out]`)
  .join(';')}`

const arguments_ = ['-y', '-i', cheminSource, '-filter_complex', decoupage]

paliers.forEach((palier, i) => {
  arguments_.push(
    '-map', `[v${i}out]`,
    `-c:v:${i}`, 'libx264',
    `-b:v:${i}`, palier.video,
    `-maxrate:v:${i}`, palier.plafond,
    `-bufsize:v:${i}`, palier.plafond,
    `-preset:v:${i}`, 'veryfast',
    `-profile:v:${i}`, 'main',
  )
})

paliers.forEach((palier, i) => {
  arguments_.push('-map', 'a:0', `-c:a:${i}`, 'aac', `-b:a:${i}`, palier.audio, `-ac:a:${i}`, '2')
})

arguments_.push(
  // Des images clés alignées sur les segments : sans cela, le lecteur ne peut
  // pas changer de qualité proprement en cours de lecture.
  '-g', '48',
  '-keyint_min', '48',
  '-sc_threshold', '0',
  '-f', 'hls',
  '-hls_time', '6',
  '-hls_playlist_type', 'vod',
  '-hls_flags', 'independent_segments',
  '-hls_segment_filename', join(sortie, '%v', 'segment_%04d.ts'),
  '-master_pl_name', 'master.m3u8',
  '-var_stream_map',
  paliers.map((p, i) => `v:${i},a:${i},name:${p.hauteur}p`).join(' '),
  join(sortie, '%v', 'index.m3u8'),
)

console.log('Transcodage en cours…')
execFileSync('ffmpeg', arguments_, { stdio: ['ignore', 'ignore', 'inherit'] })

// Image d'attente, prise à la deuxième seconde — la première est souvent noire.
execFileSync(
  'ffmpeg',
  ['-y', '-ss', '2', '-i', cheminSource, '-frames:v', '1', '-vf', 'scale=-2:720', join(sortie, 'poster.jpg')],
  { stdio: ['ignore', 'ignore', 'ignore'] },
)

function poids(dossier) {
  return readdirSync(dossier, { withFileTypes: true }).reduce((total, entree) => {
    const chemin = join(dossier, entree.name)
    return total + (entree.isDirectory() ? poids(chemin) : statSync(chemin).size)
  }, 0)
}

const octets = poids(sortie)

writeFileSync(
  join(sortie, 'info.json'),
  `${JSON.stringify(
    {
      cle,
      source,
      dureeSecondes,
      paliers: paliers.map((p) => `${p.hauteur}p`),
      octets,
      transcodeLe: new Date().toISOString(),
    },
    null,
    2,
  )}\n`,
)

const mo = (octets / 1024 / 1024).toFixed(1)
console.log(`\n✓ ${cle} — ${mo} Mo dans medias/hls/${cle}\n`)
console.log('Rattacher le flux au chapitre :')
console.log(
  `  update chapitres set video_cle = '${cle}', video_duree_secondes = ${dureeSecondes}\n   where module_id = '…' and position = …;\n`,
)
console.log(`Envoyer sur le CDN :  npm run video:publier -- ${cle}\n`)
