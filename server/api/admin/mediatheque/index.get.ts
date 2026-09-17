import { listerMediatheque } from '../../../database/mediatheque'
import { exigerSection } from '../../../utils/session'
import { urlLectureSignee } from '../../../utils/video'

/**
 * Le fonds vidéo, avec de quoi le regarder.
 *
 * Chaque entrée repart avec une adresse de lecture signée : sans elle, la
 * médiathèque montrerait une liste de noms, et choisir entre deux fichiers au
 * titre voisin demanderait de les redéposer pour les distinguer. L'autorisation
 * est nominative et vaut quatre heures, comme celle d'un apprenant.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'modules-chapitres')
  const videos = await listerMediatheque()

  return Promise.all(
    videos.map(async (video) => ({
      ...video,
      url: await urlLectureSignee(video.cle, admin.id, video.format),
    })),
  )
})
