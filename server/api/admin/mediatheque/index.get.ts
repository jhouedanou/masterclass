import { travauxDesVideos } from '../../../database/encodage'
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
 *
 * L'état d'encodage accompagne chaque entrée. Sans lui, une vidéo déposée reste
 * un MP4 mono-débit pendant plusieurs minutes sans que rien ne dise pourquoi —
 * et un échec ne se verrait jamais, une file qu'on ne regarde pas étant une
 * file qui ne se vide pas.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'modules-chapitres')
  const videos = await listerMediatheque()
  const travaux = await travauxDesVideos(videos.map((v) => v.id))

  return Promise.all(
    videos.map(async (video) => {
      const travail = travaux.get(video.id)
      return {
        ...video,
        url: await urlLectureSignee(video.cle, admin.id, video.format),
        encodage: travail
          ? {
              statut: travail.statut,
              tentatives: travail.tentatives,
              paliers: travail.paliers,
              erreur: travail.erreur,
            }
          : null,
      }
    }),
  )
})
