import { trouverModuleParSlug } from '../../../database/catalogue'
import { trouverAcces } from '../../../database/comptes'
import { exigerUtilisateur } from '../../../utils/session'
import { DUREE_AUTORISATION_SECONDES, urlLectureSignee } from '../../../utils/video'

/**
 * Autorisations de lecture des vidéos d'un module.
 *
 * L'accès est vérifié ici, une fois, puis matérialisé par des URL signées à
 * durée limitée : le CDN les contrôle ensuite seul, sans repasser par
 * l'application. Une URL n'est donc ni devinable ni réutilisable longtemps, et
 * la diffusion ne coûte aucun aller-retour applicatif.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const slug = getRouterParam(event, 'slug')

  const moduleTrouve = await trouverModuleParSlug(slug ?? '')
  if (!moduleTrouve) {
    throw createError({ statusCode: 404, statusMessage: 'Module introuvable' })
  }

  const acces = await trouverAcces(utilisateur.id, moduleTrouve.id)
  if (!acces) {
    throw createError({ statusCode: 403, statusMessage: 'Ce module ne fait pas partie de vos accès' })
  }

  const chapitres = await Promise.all(
    moduleTrouve.chapitres.map(async (chapitre, position) => ({
      position,
      dureeSecondes: chapitre.videoDureeSecondes ?? null,
      // Un chapitre sans vidéo montée renvoie `null` : le lecteur affiche son
      // écran d'attente plutôt qu'une erreur.
      url: chapitre.videoCle ? await urlLectureSignee(chapitre.videoCle, utilisateur.id) : null,
    })),
  )

  return { chapitres, expireDansSecondes: DUREE_AUTORISATION_SECONDES }
})
