import { enregistrerJournal } from '../../../database/administration'
import { mettreEnFile } from '../../../database/encodage'
import { trouverVideo } from '../../../database/mediatheque'
import { exigerSection } from '../../../utils/session'

/**
 * Remet une vidéo en file d'encodage.
 *
 * Le dépôt met en file tout seul : cette route sert à ce qu'il ne couvre pas —
 * reprendre un travail en échec, et surtout transcoder le fonds déjà en ligne,
 * déposé avant que la file n'existe. Sans elle, le premier essai de l'exécutant
 * demanderait d'écrire à la main dans la base.
 *
 * Reprendre une vidéo déjà en multi-débit est refusé : ce serait réencoder un
 * flux à partir d'un MP4 que l'on croit encore là, et qu'une passe de nettoyage
 * aura peut-être emporté.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'modules-chapitres')
  const { videoId } = await readBody<{ videoId: string }>(event)

  const video = await trouverVideo(videoId)
  if (!video) throw createError({ statusCode: 404, statusMessage: 'Vidéo introuvable' })

  if (video.format === 'hls') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Cette vidéo est déjà servie en plusieurs débits.',
    })
  }

  const travail = await mettreEnFile(video.id, video.cle)
  if (!travail) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Un encodage est déjà en attente ou en cours pour cette vidéo.',
    })
  }

  await enregistrerJournal(
    `${admin.prenom} ${admin.nom}`,
    'a mis une vidéo en file d’encodage',
    `${video.nom} (${video.cle})`,
    { type: 'contenu', objet: video.id },
  )

  return { videoId: video.id, travailId: travail.id }
})
