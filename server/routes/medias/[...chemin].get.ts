import { createReadStream, readFileSync, statSync } from 'node:fs'
import { join, normalize, resolve } from 'node:path'
import { reecrirePlaylist, secretVideo, verifierSignature } from '../../utils/video'

/**
 * Diffusion locale des vidéos, en développement.
 *
 * En production, c'est le Worker Cloudflare (`infra/worker-video`) qui rend ce
 * service, devant le stockage d'objets — l'application ne voit jamais passer un
 * segment vidéo. Cette route applique exactement la même règle de signature,
 * pour que le lecteur se comporte de façon identique des deux côtés et qu'une
 * erreur d'autorisation se voie dès le poste de développement.
 */
const RACINE_MEDIAS = resolve(process.cwd(), 'medias/hls')

const TYPES: Record<string, string> = {
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
  '.mp4': 'video/mp4',
  '.vtt': 'text/vtt',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.json': 'application/json',
}

/**
 * Lecture d'un en-tête `Range`. Une seule plage est gérée — c'est tout ce
 * qu'envoie un lecteur vidéo — sous ses trois formes : « depuis tel octet »,
 * « de tel à tel », et « les N derniers ».
 */
function plageDemandee(entete: string | undefined, taille: number) {
  if (!entete) return null
  const correspondance = /^bytes=(\d*)-(\d*)$/.exec(entete.trim())
  if (!correspondance) return null

  const [, debutBrut, finBrut] = correspondance
  if (!debutBrut && !finBrut) return null

  // « bytes=-1024 » : les mille vingt-quatre derniers octets.
  if (!debutBrut) {
    const longueur = Math.min(Number(finBrut), taille)
    return { debut: taille - longueur, fin: taille - 1 }
  }

  const debut = Number(debutBrut)
  const fin = finBrut ? Math.min(Number(finBrut), taille - 1) : taille - 1
  if (debut > fin || debut >= taille) return 'hors-bornes' as const
  return { debut, fin }
}

export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV === 'production' && !process.env.MEDIAS_LOCAUX) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Les vidéos sont servies par le CDN en production (VIDEO_BASE_URL)',
    })
  }

  const chemin = (getRouterParam(event, 'chemin') ?? '').replace(/^\/+/, '')
  const parametres = new URLSearchParams(getQuery(event) as Record<string, string>)

  const refus = await verifierSignature(chemin, parametres, secretVideo())
  if (refus) {
    throw createError({ statusCode: 403, statusMessage: `Lecture refusée — ${refus}` })
  }

  // Le chemin vient du réseau : le normaliser puis vérifier qu'il reste sous
  // la racine ferme la porte aux remontées de dossier (`../`).
  const fichier = join(RACINE_MEDIAS, normalize(chemin))
  if (!fichier.startsWith(RACINE_MEDIAS + '/')) {
    throw createError({ statusCode: 400, statusMessage: 'Chemin invalide' })
  }

  let infos
  try {
    infos = statSync(fichier)
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Fichier introuvable' })
  }

  const extension = fichier.slice(fichier.lastIndexOf('.'))

  // Le manifeste est réécrit pour porter l'autorisation sur les variantes et
  // les segments qu'il référence — même règle que le Worker.
  if (extension === '.m3u8') {
    setResponseHeader(event, 'content-type', TYPES[extension])
    setResponseHeader(event, 'cache-control', 'private, max-age=60')
    return reecrirePlaylist(readFileSync(fichier, 'utf8'), parametres.toString())
  }

  // Sans `Accept-Ranges`, Safari refuse de lire un média et se déplacer dans
  // une vidéo devient impossible partout : le Worker applique la même règle.
  setResponseHeaders(event, {
    'content-type': TYPES[extension] ?? 'application/octet-stream',
    'accept-ranges': 'bytes',
    'content-disposition': 'inline',
    // Segments et fichiers uniques sont immuables — un remplacement produit
    // une clé neuve. Le cache privé évite qu'un intermédiaire partagé serve un
    // contenu autorisé pour un autre apprenant.
    'cache-control': 'private, max-age=31536000, immutable',
  })

  const portion = plageDemandee(getHeader(event, 'range'), infos.size)

  if (portion === 'hors-bornes') {
    setResponseHeader(event, 'content-range', `bytes */${infos.size}`)
    setResponseStatus(event, 416)
    return ''
  }

  if (portion) {
    const longueur = portion.fin - portion.debut + 1
    setResponseHeaders(event, {
      'content-range': `bytes ${portion.debut}-${portion.fin}/${infos.size}`,
      'content-length': longueur,
    })
    setResponseStatus(event, 206)
    return sendStream(event, createReadStream(fichier, { start: portion.debut, end: portion.fin }))
  }

  setResponseHeader(event, 'content-length', infos.size)
  return sendStream(event, createReadStream(fichier))
})
