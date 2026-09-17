import { enregistrerJournal } from '../../../database/administration'
import { effacerVideo, trouverVideo } from '../../../database/mediatheque'
import { exigerSection } from '../../../utils/session'
import { supprimerObjet } from '../../../utils/video'

/**
 * Effacement définitif d'une vidéo.
 *
 * Le refus nomme les chapitres qui s'en servent. Un « impossible, vidéo
 * utilisée » sec obligerait à ouvrir les dix-huit modules un par un pour
 * trouver lequel, alors que la base le sait.
 *
 * L'objet part après la ligne : l'inverse laisserait, en cas d'échec du
 * stockage, une entrée désignant un fichier absent — soit une vidéo qui
 * s'affiche partout et ne se lit nulle part.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'modules-chapitres')
  const { id } = await readBody<{ id: string }>(event)

  const video = await trouverVideo(id)
  if (!video) throw createError({ statusCode: 404, statusMessage: 'Vidéo introuvable' })

  if (video.usages.length) {
    const ou = video.usages
      .map((u) => `${u.moduleTitre} — ${u.libelle}`)
      .slice(0, 5)
      .join(', ')
    const reste = video.usages.length > 5 ? ` et ${video.usages.length - 5} autre(s)` : ''
    throw createError({
      statusCode: 409,
      statusMessage: `Cette vidéo sert encore ${video.usages.length} chapitre(s) : ${ou}${reste}. Retirez-la d’abord de ces chapitres.`,
    })
  }

  if (video.format === 'hls') {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Cette vidéo est un flux transcodé à la main : son dossier contient des centaines de fichiers et se retire en ligne de commande.',
    })
  }

  await effacerVideo(id)
  await supprimerObjet(video.cle, admin.id).catch(() => undefined)

  await enregistrerJournal(
    `${admin.prenom} ${admin.nom}`,
    'a supprimé une vidéo de la médiathèque',
    `${video.nom} (${video.cle})`,
    { type: 'contenu', objet: id },
  )

  setResponseStatus(event, 204)
  return null
})
