/**
 * Recale les durées de chapitre sur ce que disent les fichiers déposés.
 *
 *   npm run video:durees              — constate, n'écrit rien
 *   npm run video:durees -- --appliquer
 *
 * Les durées en base ont été rapportées par le navigateur de l'administrateur
 * au moment du dépôt. Ce script va les relire à la source : pour chaque
 * chapitre pointant un fichier, il demande au diffuseur le premier mégaoctet
 * de l'objet, y lit la boîte `mvhd`, et compare. Un mégaoctet par chapitre,
 * quelle que soit la taille des vidéos.
 *
 * Les chapitres en HLS sont laissés de côté : leur durée se lit dans le
 * manifeste, pas dans un MP4.
 *
 * Sans --appliquer, rien n'est écrit — l'écart se lit d'abord.
 */
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { dureeMp4, OCTETS_ENTETE_MP4 } from '../shared/utils/dureeMp4.ts'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')
const appliquer = process.argv.includes('--appliquer')

// Le fichier d'environnement n'est pas chargé par Node : les quelques lignes
// qui suivent évitent une dépendance pour trois variables.
for (const ligne of lireEnv()) {
  const separation = ligne.indexOf('=')
  if (separation < 1 || ligne.trimStart().startsWith('#')) continue
  const nom = ligne.slice(0, separation).trim()
  if (!process.env[nom]) {
    process.env[nom] = ligne.slice(separation + 1).trim().replace(/^['"]|['"]$/g, '')
  }
}

function lireEnv() {
  try {
    return readFileSync(join(RACINE, '.env'), 'utf8').split('\n')
  } catch {
    return []
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_CLE = process.env.SUPABASE_SECRET_KEY
const VIDEO_BASE = (process.env.VIDEO_BASE_URL || '').replace(/\/+$/, '')
const SECRET = process.env.VIDEO_SIGNING_SECRET || ''

const manquantes = [
  !SUPABASE_URL && 'SUPABASE_URL',
  !SUPABASE_CLE && 'SUPABASE_SECRET_KEY',
  !VIDEO_BASE && 'VIDEO_BASE_URL',
  SECRET.length < 32 && 'VIDEO_SIGNING_SECRET (32 caractères minimum)',
].filter(Boolean)

if (manquantes.length) {
  console.error(`Variables absentes dans .env : ${manquantes.join(', ')}`)
  process.exit(1)
}

/** Même message et même clé que l'application : le diffuseur ne distingue pas
 *  ce script d'une lecture ordinaire. */
function urlSignee(cle) {
  const expiration = Math.floor(Date.now() / 1000) + 300
  const utilisateur = 'script-rattrapage-durees'
  const signature = createHmac('sha256', SECRET)
    .update(`${cle}.${expiration}.${utilisateur}`)
    .digest('base64url')
  const parametres = new URLSearchParams({ e: String(expiration), u: utilisateur, s: signature })
  return `${VIDEO_BASE}/${cle}/video.mp4?${parametres}`
}

async function supabase(chemin, options = {}) {
  const reponse = await fetch(`${SUPABASE_URL}/rest/v1/${chemin}`, {
    ...options,
    headers: {
      apikey: SUPABASE_CLE,
      authorization: `Bearer ${SUPABASE_CLE}`,
      'content-type': 'application/json',
      ...options.headers,
    },
  })
  if (!reponse.ok) throw new Error(`${reponse.status} — ${await reponse.text()}`)
  return reponse.status === 204 ? null : reponse.json()
}

const enSecondes = (s) => `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, '0')} s`

const chapitres = await supabase(
  'chapitres?select=id,libelle,video_cle,video_duree_secondes,video_nom_fichier&video_format=eq.fichier&video_cle=not.is.null&order=module_id,position',
)

if (!chapitres.length) {
  console.log('Aucun chapitre en vidéo-fichier.')
  process.exit(0)
}

console.log(`${chapitres.length} chapitre(s) à contrôler${appliquer ? '' : ' — constat seul'}\n`)

let justes = 0
let corriges = 0
let illisibles = 0

for (const chapitre of chapitres) {
  const nom = `${chapitre.libelle} (${chapitre.video_nom_fichier ?? chapitre.video_cle})`
  let entete

  try {
    const reponse = await fetch(urlSignee(chapitre.video_cle), {
      headers: { range: `bytes=0-${OCTETS_ENTETE_MP4 - 1}` },
    })
    if (!reponse.ok) throw new Error(`${reponse.status} ${await reponse.text()}`)
    entete = await reponse.arrayBuffer()
  } catch (erreur) {
    console.log(`  \x1b[33m?\x1b[0m ${nom} — objet illisible : ${erreur.message}`)
    illisibles++
    continue
  }

  const mesuree = dureeMp4(entete)
  if (!mesuree) {
    // Le `moov` est derrière les données : le fichier est antérieur au
    // contrôle « optimisé pour le web », et il faut le redéposer.
    console.log(`  \x1b[33m?\x1b[0m ${nom} — durée absente de l’en-tête (fichier non optimisé ?)`)
    illisibles++
    continue
  }

  const arrondie = Math.round(mesuree)
  const actuelle = chapitre.video_duree_secondes

  if (actuelle === arrondie) {
    justes++
    continue
  }

  const ecart = actuelle == null ? null : arrondie - actuelle
  const detail =
    actuelle == null
      ? `durée absente → ${enSecondes(arrondie)}`
      : `${enSecondes(actuelle)} → ${enSecondes(arrondie)} (${ecart > 0 ? '+' : ''}${ecart} s)`

  if (appliquer) {
    await supabase(`chapitres?id=eq.${chapitre.id}`, {
      method: 'PATCH',
      headers: { prefer: 'return=minimal' },
      body: JSON.stringify({ video_duree_secondes: arrondie }),
    })
    console.log(`  \x1b[32m✓\x1b[0m ${nom} — ${detail}`)
  } else {
    console.log(`  \x1b[36m·\x1b[0m ${nom} — ${detail}`)
  }
  corriges++
}

console.log(
  `\n${justes} exacte(s), ${corriges} ${appliquer ? 'corrigée(s)' : 'à corriger'}, ${illisibles} illisible(s)`,
)
if (corriges && !appliquer) console.log('Relancer avec --appliquer pour écrire.')
