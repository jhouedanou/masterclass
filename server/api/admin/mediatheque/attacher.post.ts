import { enregistrerJournal } from '../../../database/administration'
import { majVideoChapitre, trouverChapitre } from '../../../database/catalogue'
import { trouverVideo } from '../../../database/mediatheque'
import { televersementEnCours } from '../../../database/video'
import { exigerSection } from '../../../utils/session'

/**
 * Rattachement d'une vidéo déjà en ligne à un chapitre.
 *
 * C'est le geste qui justifie la médiathèque : une introduction commune à deux
 * modules ne se téléverse plus deux fois, et ne coûte plus deux fois son poids
 * dans le stockage.
 *
 * Rien n'est copié — le chapitre désigne l'objet existant, et les colonnes
 * `video_*` en prennent la copie que le chemin de lecture attend.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'modules-chapitres')
  const { chapitreId, videoId } = await readBody<{ chapitreId: string; videoId: string }>(event)

  const chapitre = await trouverChapitre(chapitreId)
  if (!chapitre) throw createError({ statusCode: 404, statusMessage: 'Chapitre introuvable' })

  const video = await trouverVideo(videoId)
  if (!video) throw createError({ statusCode: 404, statusMessage: 'Vidéo introuvable' })

  // Un dépôt en vol écrirait par-dessus ce rattachement en se finalisant, sans
  // que rien ne le signale : mieux vaut le dire maintenant.
  const depot = await televersementEnCours(chapitreId)
  if (depot) {
    throw createError({
      statusCode: 409,
      statusMessage: `Un téléversement de « ${depot.nomFichier} » est en cours sur ce chapitre : abandonnez-le avant de choisir une autre vidéo.`,
    })
  }

  if (chapitre.video_id === videoId) {
    return { chapitreId, videoId, inchange: true }
  }

  await majVideoChapitre(chapitreId, {
    videoCle: video.cle,
    videoId: video.id,
    videoFormat: video.format,
    videoDureeSecondes: video.dureeSecondes,
    videoNomFichier: video.nomFichier,
    videoTailleOctets: video.tailleOctets,
  })

  await enregistrerJournal(
    `${admin.prenom} ${admin.nom}`,
    'a rattaché une vidéo de la médiathèque',
    `${chapitre.libelle} — ${video.nom}`,
    { type: 'contenu', objet: chapitreId },
  )

  return { chapitreId, videoId, inchange: false }
})
