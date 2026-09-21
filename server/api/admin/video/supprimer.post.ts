import { enregistrerJournal } from '../../../database/administration'
import { majVideoChapitre, trouverChapitre } from '../../../database/catalogue'
import { exigerSection } from '../../../utils/session'

/**
 * Retrait de la vidéo d'un chapitre.
 *
 * Les deux vidéos de démonstration, transcodées à la main avant l'arrivée du
 * dépôt, ne se suppriment pas d'ici : leur dossier contient des centaines de
 * fichiers qui ne sont référencés nulle part en base, et les effacer par
 * mégarde demanderait un nouveau transcodage.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'modules-chapitres')
  const { chapitreId } = await readBody<{ chapitreId: string }>(event)

  const chapitre = await trouverChapitre(chapitreId)
  if (!chapitre) throw createError({ statusCode: 404, statusMessage: 'Chapitre introuvable' })
  if (!chapitre.video_cle) {
    throw createError({ statusCode: 409, statusMessage: 'Ce chapitre n’a pas de vidéo.' })
  }
  if (chapitre.video_format === 'hls') {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Cette vidéo est un flux transcodé à la main : elle se retire en ligne de commande, pas ici.',
    })
  }

  await majVideoChapitre(chapitreId, {
    videoCle: null,
    videoId: null,
    videoFormat: null,
    videoDureeSecondes: null,
    videoNomFichier: null,
    videoTailleOctets: null,
  })

  await enregistrerJournal(
    `${admin.prenom} ${admin.nom}`,
    'a retiré la vidéo du chapitre',
    `${chapitre.libelle} — ${chapitre.video_nom_fichier ?? chapitre.video_cle}`,
    { type: 'contenu', objet: chapitreId },
  )

  setResponseStatus(event, 204)
  return null
})
