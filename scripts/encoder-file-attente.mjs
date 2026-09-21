/**
 * Exécutant d'encodage : dépile la file et transcode.
 *
 *   npm run video:encoder            # une passe, puis sortie
 *   npm run video:encoder -- --boucle  # tourne en continu
 *
 * Il se tient entre l'application et le stockage, et c'est tout ce qu'il fait :
 * il demande un travail, tire le MP4 déposé, appelle ffmpeg, repousse le flux,
 * dit si ça s'est bien passé. Rien de métier ne vit ici — l'application décide
 * seule de ce qui bascule en multi-débit et quand.
 *
 * Pourquoi un processus séparé. Aucune des deux moitiés de la chaîne ne peut
 * transcoder : un Worker Cloudflare est un isolat V8, sans binaire natif ni
 * processus fils ; l'application, elle, tourne sur un hébergement sans état
 * dont les requêtes se comptent en secondes. ffmpeg demande des minutes de
 * processeur et des gigaoctets de disque. D'où une machine à part, qui peut
 * être un conteneur allumé à la demande.
 *
 * Pourquoi il ne descend pas chez nous. Le fichier déposé et le flux produit
 * pèsent ensemble plusieurs gigaoctets. Les faire transiter par un poste de
 * travail à Abidjan reviendrait à payer deux fois le lien montant le plus lent
 * de la chaîne, pour un calcul qui n'a besoin de personne.
 *
 * Ce qu'il lui faut :
 *   · ffmpeg et ffprobe dans le PATH ;
 *   · APP_URL et TACHES_CLE — pour parler à l'application ;
 *   · les identifiants R2 de wrangler (CLOUDFLARE_API_TOKEN, ou `wrangler login`)
 *     et VIDEO_BUCKET s'il ne s'appelle pas `emasterclass-videos`.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')
const BUCKET = process.env.VIDEO_BUCKET || 'emasterclass-videos'
const APP = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '')
const CLE = process.env.TACHES_CLE || ''
const BOUCLE = process.argv.includes('--boucle')
/** Attente entre deux sondages quand la file est vide. */
const REPOS_SECONDES = Number(process.env.ENCODAGE_REPOS_SECONDES) || 30

if (!CLE) {
  console.error('TACHES_CLE manquante : l’exécutant ne peut pas s’authentifier auprès de l’application.')
  process.exit(1)
}

async function appeler(route, corps) {
  const reponse = await fetch(`${APP}/api/taches/encodage/${route}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${CLE}`, 'content-type': 'application/json' },
    body: JSON.stringify(corps ?? {}),
  })
  if (reponse.status === 204) return null
  const texte = await reponse.text()
  if (!reponse.ok) throw new Error(`${route} → ${reponse.status} ${texte.slice(0, 300)}`)
  return texte ? JSON.parse(texte) : null
}

function wrangler(...arguments_) {
  return execFileSync('npx', ['wrangler', ...arguments_], {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  })
}

function fichiersDe(dossier) {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = join(dossier, entree.name)
    return entree.isDirectory() ? fichiersDe(chemin) : [chemin]
  })
}

/**
 * Transcode un travail, de bout en bout.
 *
 * Le dossier de travail est effacé quoi qu'il arrive : un exécutant qui tourne
 * en boucle sur un conteneur remplirait sinon son disque en une journée.
 */
async function traiter(travail) {
  const atelier = join(RACINE, 'medias/atelier', travail.cle)
  const source = join(atelier, 'source.mp4')
  const sortie = join(RACINE, 'medias/hls', travail.cle)

  console.log(`\n▸ ${travail.cle} (tentative ${travail.tentatives})`)

  try {
    rmSync(atelier, { recursive: true, force: true })
    rmSync(sortie, { recursive: true, force: true })
    mkdirSync(atelier, { recursive: true })

    // 1. Le MP4 déposé vient du stockage, pas de l'application : celle-ci ne
    //    voit jamais passer les octets d'une vidéo, et ce n'est pas le moment
    //    de commencer.
    console.log('  ↓ récupération du dépôt')
    wrangler('r2', 'object', 'get', `${BUCKET}/${travail.cle}/video.mp4`, '--file', source, '--remote')
    console.log(`    ${(statSync(source).size / 1024 / 1024).toFixed(1)} Mo`)

    // 2. Le transcodeur reste seul maître de l'échelle de qualité : l'appeler
    //    plutôt que de recopier ses réglages évite deux vérités concurrentes.
    console.log('  ⚙ transcodage')
    execFileSync('node', [join(RACINE, 'scripts/transcoder-video.mjs'), source, travail.cle], {
      stdio: ['ignore', 'inherit', 'inherit'],
    })

    const info = JSON.parse(readFileSync(join(sortie, 'info.json'), 'utf8'))

    // 3. Le flux rejoint le dossier du dépôt. `video.mp4` y reste : il rend la
    //    bascule réversible, et couvre le cas où le report du format
    //    n'atteindrait pas tous les chapitres.
    const liste = fichiersDe(sortie)
    console.log(`  ↑ ${liste.length} fichiers vers ${BUCKET}`)
    for (const fichier of liste) {
      const distant = relative(join(RACINE, 'medias/hls'), fichier)
      wrangler('r2', 'object', 'put', `${BUCKET}/${distant}`, '--file', fichier, '--remote')
    }

    await appeler('terminer', {
      id: travail.id,
      paliers: info.paliers,
      dureeSecondes: info.dureeSecondes ?? null,
      octets: info.octets ?? null,
    })
    console.log(`  ✓ ${info.paliers.join(' · ')}`)
  } catch (erreur) {
    const motif = String(erreur?.stderr || erreur?.message || erreur).trim().slice(0, 1000)
    console.error(`  ✗ ${motif.split('\n').slice(-3).join(' ')}`)
    // L'échec est rendu à l'application, qui décide seule si le travail
    // retourne à la file ou s'arrête là.
    await appeler('echouer', { id: travail.id, erreur: motif }).catch((e) =>
      console.error(`  ✗ échec non consigné : ${e.message}`),
    )
  } finally {
    rmSync(atelier, { recursive: true, force: true })
    rmSync(sortie, { recursive: true, force: true })
  }
}

console.log(`Exécutant d’encodage — ${APP} → ${BUCKET}${BOUCLE ? ' (en boucle)' : ''}`)

for (;;) {
  let travail = null
  try {
    travail = await appeler('prendre')
  } catch (erreur) {
    console.error(`File injoignable : ${erreur.message}`)
    if (!BOUCLE) process.exit(1)
  }

  if (travail) {
    await traiter(travail)
    // On enchaîne sans repos : la file peut être longue après une séance de
    // dépôts, et rien ne justifie d'attendre entre deux fichiers.
    continue
  }

  if (!BOUCLE) {
    console.log('File vide — rien à encoder.\n')
    break
  }
  await new Promise((r) => setTimeout(r, REPOS_SECONDES * 1000))
}
