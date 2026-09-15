import { enregistrerJournal } from '../../../database/administration'
import { listerChapitres, trouverModule } from '../../../database/catalogue'
import { ouvrirTeleversement, televersementEnCours } from '../../../database/video'
import {
  abandonnerDepot,
  baseVideo,
  cleChapitre,
  FORMATS_VIDEO_ACCEPTES,
  jetonEcriture,
  ouvrirDepot,
} from '../../../utils/video'
import { exigerSection } from '../../../utils/session'

/** Deux gigaoctets : au-delà, ce n'est plus un chapitre, c'est un montage à
 *  découper. Un MP4 optimisé d'une heure en pèse trois à sept cents. */
const TAILLE_MAXIMALE = 2 * 1024 * 1024 * 1024
const TAILLE_MINIMALE = 1024 * 1024

/**
 * Ouverture d'un dépôt de vidéo.
 *
 * L'ordre compte : le téléversement est créé chez le diffuseur d'abord, la
 * ligne de suivi ensuite. L'inverse laisserait en base une ligne pointant un
 * dépôt inexistant, et la reprise buterait dessus sans recours.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'modules-chapitres')
  const body = await readBody<{
    chapitreId: string
    moduleId: string
    nomFichier: string
    tailleOctets: number
    dureeSecondes: number
  }>(event)

  const moduleTrouve = await trouverModule(body.moduleId)
  if (!moduleTrouve) throw createError({ statusCode: 404, statusMessage: 'Module introuvable' })

  const chapitres = await listerChapitres(body.moduleId)
  const chapitre = chapitres.find((c) => c.id === body.chapitreId)
  if (!chapitre) throw createError({ statusCode: 404, statusMessage: 'Chapitre introuvable' })

  const extension = (body.nomFichier ?? '').split('.').pop()?.toLowerCase() ?? ''
  if (!FORMATS_VIDEO_ACCEPTES.includes(extension as never)) {
    throw createError({
      statusCode: 415,
      statusMessage: `Format refusé : ${FORMATS_VIDEO_ACCEPTES.join(', ').toUpperCase()} attendu.`,
    })
  }
  if (!Number.isFinite(body.tailleOctets) || body.tailleOctets < TAILLE_MINIMALE) {
    throw createError({ statusCode: 422, statusMessage: 'Fichier vide ou trop petit' })
  }
  if (body.tailleOctets > TAILLE_MAXIMALE) {
    throw createError({
      statusCode: 413,
      statusMessage: 'Fichier au-delà de 2 Go : réexportez-le dans une qualité plus raisonnable.',
    })
  }
  if (!Number.isFinite(body.dureeSecondes) || body.dureeSecondes <= 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Durée illisible : ce fichier n’est peut-être pas une vidéo valide.',
    })
  }

  // Deux dépôts concurrents laisseraient un téléversement orphelin, facturé
  // sans que rien ne le montre. L'index unique le refuse aussi, mais le dire
  // ici évite d'ouvrir un dépôt chez le diffuseur pour rien.
  const encours = await televersementEnCours(body.chapitreId)
  if (encours) {
    throw createError({
      statusCode: 409,
      statusMessage: `Un téléversement de « ${encours.nomFichier} » est déjà en cours sur ce chapitre.`,
    })
  }

  const cle = cleChapitre(moduleTrouve.slug, chapitre.position)
  const { uploadId, taillePart } = await ouvrirDepot(cle, admin.id)
  const nbParts = Math.ceil(body.tailleOctets / taillePart)

  let suivi
  try {
    suivi = await ouvrirTeleversement({
      chapitreId: body.chapitreId,
      cle,
      uploadId,
      nomFichier: body.nomFichier,
      tailleOctets: body.tailleOctets,
      taillePartOctets: taillePart,
      nbParts,
      dureeSecondes: Math.round(body.dureeSecondes),
      ouvertPar: admin.id,
    })
  } catch (erreur) {
    // Pas de dépôt orphelin : si le suivi n'a pas pu être écrit, on referme
    // immédiatement ce qu'on vient d'ouvrir.
    await abandonnerDepot(cle, uploadId, admin.id).catch(() => undefined)
    throw erreur
  }

  await enregistrerJournal(
    `${admin.prenom} ${admin.nom}`,
    'a lancé le dépôt de la vidéo',
    `${moduleTrouve.titre} — ${chapitre.libelle} (${body.nomFichier})`,
    { type: 'contenu', objet: body.chapitreId },
  )

  const { requete, expiration } = await jetonEcriture('part', cle, uploadId, admin.id)
  return {
    cle,
    uploadId: suivi.uploadId,
    taillePart,
    nbParts,
    // Le navigateur pousse les parts directement : il reçoit l'adresse et son
    // autorisation, jamais le secret qui l'a produite.
    urlPart: `${baseVideo()}/_televersement/part?${requete}`,
    expireLe: expiration,
  }
})
