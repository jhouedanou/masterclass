import type { H3Event } from 'h3'
import { randomBytes } from 'node:crypto'
import { supabase } from '../database/client'

/**
 * Images de personnes : photo de profil de l'apprenant (planche B, écran 04)
 * et portrait du formateur (planche D, écran 02).
 *
 * Les deux écrans posent le même problème — recevoir un fichier d'un
 * navigateur, en vérifier la nature et la taille, le ranger dans un seau
 * Supabase — et l'avaient résolu chacun de leur côté. Un seul chemin de code
 * ici : ce qui sépare réellement les deux usages tient dans le descripteur
 * `Seau`, tout le reste leur est commun.
 *
 * Le fichier vit dans le stockage d'objets, jamais en base ni sur le disque :
 * l'hébergement applicatif n'a pas de volume persistant (voir le commentaire
 * « cron externe » de `nuxt.config.ts`), un fichier écrit à côté du serveur
 * disparaîtrait au déploiement suivant.
 *
 * Les vidéos, elles, restent sur R2 derrière le Worker : elles se comptent en
 * gigaoctets et demandent une autorisation signée (voir `server/utils/video.ts`).
 *
 * Les fonctions de stockage passent par `supabase()`, qui n'ouvre le client
 * qu'au premier appel : importer ce module depuis les mappers, qui n'ont besoin
 * que de `urlPhoto`, ne les rattache à aucune connexion.
 */

export type Seau = {
  /** Nom du seau Supabase. Il est public : ces images s'affichent sur des
   *  pages ouvertes, elles n'ont rien à protéger. */
  nom: string
  /** Plafond en octets. Le même est posé sur le seau côté Supabase, qui reste
   *  le verrou : celui-ci évite seulement le voyage inutile. */
  tailleMax: number
  /** Le même plafond, écrit pour l'affichage. */
  tailleMaxLibelle: string
  /**
   * Seau absent des migrations, à créer au premier envoi.
   *
   * `photos-profil` est déclaré par `…_photo_profil.sql`, comme il se doit.
   * `portraits` est né d'un appel à l'exécution, avant que la convention ne se
   * fixe, et le reste : le déclarer en migration aujourd'hui reviendrait à
   * rejouer une création sur une base où il existe déjà.
   */
  creerALaVolee?: boolean
}

/** Photos de profil des apprenants. 512 ko : le portrait ne s'affiche jamais
 *  au-delà de 80 pixels de côté, et le dépôt part souvent d'un mobile. */
export const SEAU_PHOTOS_PROFIL: Seau = {
  nom: 'photos-profil',
  tailleMax: 512 * 1024,
  tailleMaxLibelle: '512 ko',
}

/** Portraits des formateurs, publiés sur /formateurs et sur le bloc 8 des
 *  fiches commerciales — donc affichés en grand, d'où le plafond plus haut. */
export const SEAU_PORTRAITS: Seau = {
  nom: 'portraits',
  tailleMax: 2 * 1024 * 1024,
  tailleMaxLibelle: '2 Mo',
  creerALaVolee: true,
}

/**
 * Griffes au pied des attestations : celle de la direction et celle de chaque
 * formateur. 256 ko suffisent largement — une signature est un trait sur fond
 * transparent, et celle que l'on trace à la souris sort du canevas sous les
 * cinquante kilo-octets. Le plafond bas écarte surtout le scan de page entière
 * déposé par mégarde, qu'on ne verrait qu'écrasé dans un coin du document.
 */
export const SEAU_SIGNATURES: Seau = {
  nom: 'signatures',
  tailleMax: 256 * 1024,
  tailleMaxLibelle: '256 ko',
  creerALaVolee: true,
}

/**
 * Formats acceptés. Le SVG en est délibérément absent : un SVG est un document
 * qui peut porter du script, et servi depuis une origine publique il
 * exécuterait ce script au nom du visiteur. Le GIF et le BMP sont écartés
 * faute d'usage pour un portrait.
 */
export type FormatPhoto = { type: string; extension: string }

/** Les mêmes formats, écrits pour l'affichage et les messages d'erreur. */
export const FORMATS_LISIBLES = 'JPEG, PNG ou WebP'

const FORMATS: { signature: (o: Buffer) => boolean; format: FormatPhoto }[] = [
  {
    // JPEG : marqueur SOI suivi du premier marqueur de segment.
    signature: (o) => o[0] === 0xff && o[1] === 0xd8 && o[2] === 0xff,
    format: { type: 'image/jpeg', extension: 'jpg' },
  },
  {
    // PNG : signature de huit octets, dont le CRLF qui détecte les transferts
    // en mode texte.
    signature: (o) =>
      o[0] === 0x89 && o[1] === 0x50 && o[2] === 0x4e && o[3] === 0x47 &&
      o[4] === 0x0d && o[5] === 0x0a && o[6] === 0x1a && o[7] === 0x0a,
    format: { type: 'image/png', extension: 'png' },
  },
  {
    // WebP : conteneur RIFF dont le type de flux, en huitième position, est
    // « WEBP ». Sans ce second contrôle, n'importe quel RIFF (un AVI, un WAV)
    // passerait.
    signature: (o) =>
      o.subarray(0, 4).toString('latin1') === 'RIFF' &&
      o.subarray(8, 12).toString('latin1') === 'WEBP',
    format: { type: 'image/webp', extension: 'webp' },
  },
]

/** Les types MIME acceptés, pour la configuration du seau. */
const TYPES_ACCEPTES = FORMATS.map((f) => f.format.type)

/**
 * Format réel d'un fichier déposé, lu dans ses premiers octets.
 *
 * Ni l'extension ni l'en-tête `Content-Type` ne sont consultés : tous deux
 * viennent du navigateur et se falsifient. Renvoie `null` si les octets ne
 * correspondent à aucun format accepté.
 */
export function reconnaitrePhoto(contenu: Buffer): FormatPhoto | null {
  if (contenu.length < 12) return null
  return FORMATS.find((f) => f.signature(contenu))?.format ?? null
}

/**
 * Lit l'image d'un `multipart/form-data` et en garantit la taille et le format.
 *
 * Tout ce qui ressort d'ici est déposable tel quel : c'est le point de passage
 * unique entre un corps de requête et le stockage.
 */
export async function lireImageDeposee(
  event: H3Event,
  seau: Seau,
  champ = 'photo',
): Promise<{ contenu: Buffer; format: FormatPhoto }> {
  // Première borne, avant de mettre quoi que ce soit en mémoire : un en-tête
  // de taille déjà hors limites dispense de lire le corps. La marge de 10 %
  // couvre l'enveloppe multipart, qui s'ajoute aux octets de l'image.
  const annonce = Number(getRequestHeader(event, 'content-length') ?? 0)
  if (annonce > seau.tailleMax * 1.1) {
    throw createError({
      statusCode: 413,
      statusMessage: `Image trop lourde : ${seau.tailleMaxLibelle} maximum`,
    })
  }

  const parties = await readMultipartFormData(event)
  const fichier = parties?.find((p) => p.name === champ && p.filename)
  if (!fichier?.data?.length) {
    throw createError({
      statusCode: 422,
      statusMessage: `Aucune image reçue : ${FORMATS_LISIBLES}, ${seau.tailleMaxLibelle} au maximum.`,
    })
  }

  // Seconde borne, sur les octets réellement reçus : `content-length` vient du
  // client, il ne prouve rien.
  if (fichier.data.length > seau.tailleMax) {
    throw createError({
      statusCode: 413,
      statusMessage: `Image trop lourde : ${seau.tailleMaxLibelle} maximum`,
    })
  }

  // Le format est lu dans les octets, jamais dans l'extension ni dans le
  // `Content-Type` de la partie : tous deux sont fournis par le navigateur.
  const format = reconnaitrePhoto(fichier.data)
  if (!format) {
    throw createError({
      statusCode: 422,
      statusMessage: `Format non accepté : déposez une image ${FORMATS_LISIBLES}`,
    })
  }

  return { contenu: fichier.data, format }
}

const seauxVerifies = new Set<string>()

/** Crée le seau au premier envoi, pour ceux qu'aucune migration ne déclare.
 *  Idempotent : un seau déjà là n'est pas une erreur, et la vérification ne
 *  coûte qu'un appel par démarrage. */
async function assurerSeau(seau: Seau): Promise<void> {
  if (!seau.creerALaVolee || seauxVerifies.has(seau.nom)) return
  const { error } = await supabase().storage.createBucket(seau.nom, {
    public: true,
    fileSizeLimit: seau.tailleMax,
    allowedMimeTypes: TYPES_ACCEPTES,
  })
  // « Bucket already exists » est le cas nominal après le premier envoi.
  if (error && !/already exists/i.test(error.message)) {
    throw createError({
      statusCode: 500,
      statusMessage: `Stockage des images indisponible (${error.message}).`,
    })
  }
  seauxVerifies.add(seau.nom)
}

/**
 * Dépose l'image et renvoie son chemin dans le seau.
 *
 * Le nom de l'objet est entièrement fabriqué ici — le préfixe reçu, puis seize
 * octets d'aléa et l'extension déduite des octets du fichier. Le nom envoyé par
 * le navigateur n'est jamais réutilisé : il porterait sinon des séparateurs de
 * chemin ou une extension mensongère. L'aléa évite du même coup le cache du
 * CDN au remplacement, et rend l'objet indevinable.
 */
export async function televerserImage(
  seau: Seau,
  prefixe: string,
  contenu: Buffer,
  format: FormatPhoto,
): Promise<string> {
  await assurerSeau(seau)

  const chemin = `${prefixe}/${randomBytes(16).toString('hex')}.${format.extension}`
  const { error } = await supabase()
    .storage.from(seau.nom)
    .upload(chemin, contenu, { contentType: format.type, upsert: false })
  if (error) {
    throw createError({
      statusCode: 502,
      statusMessage: `Dépôt de l'image impossible — ${error.message}`,
    })
  }

  return chemin
}

/**
 * Efface un objet du seau. Volontairement silencieux : un fichier déjà absent
 * (seau purgé, double suppression) ne doit pas faire échouer l'opération
 * métier qui l'accompagne — le remplacement d'une photo ou la suppression du
 * compte.
 */
export async function effacerImage(seau: Seau, chemin: string | null | undefined): Promise<void> {
  if (!chemin) return
  await supabase().storage.from(seau.nom).remove([chemin])
}

/** Racine publique du seau, reconstruite à partir de `SUPABASE_URL`. Même
 *  priorité que le client Supabase : l'environnement d'exécution prime sur la
 *  valeur figée au build. */
function racinePublique(seau: Seau): string | undefined {
  const base = (process.env.SUPABASE_URL || useRuntimeConfig().supabaseUrl || '').replace(/\/+$/, '')
  if (!base) return undefined
  return `${base}/storage/v1/object/public/${seau.nom}/`
}

/**
 * URL publique d'une image. Reconstruite plutôt que stockée en base : le chemin
 * conservé reste valable si le projet Supabase change — bascule de recette en
 * production, restauration.
 */
export function urlPhoto(seau: Seau, chemin: string | null | undefined): string | undefined {
  if (!chemin) return undefined
  const racine = racinePublique(seau)
  return racine ? `${racine}${chemin}` : undefined
}

/**
 * Chemin dans le seau d'une valeur qui en porte l'URL complète, `null` sinon.
 *
 * `formateurs.photo` garde une adresse affichable et non un chemin : la colonne
 * est `not null` et les formateurs installés par le seed pointent vers un
 * fichier du site (`/images/formateurs/….svg`), qui n'a jamais transité par le
 * stockage. Ce tri sépare les deux avant d'effacer quoi que ce soit.
 */
export function cheminDansSeau(seau: Seau, valeur: string | null | undefined): string | null {
  if (!valeur) return null
  const racine = racinePublique(seau)
  if (!racine || !valeur.startsWith(racine)) return null
  return valeur.slice(racine.length) || null
}
