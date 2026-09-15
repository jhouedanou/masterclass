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

  // `revoqueLe` compte autant que l'absence de ligne : sans ce contrôle, un
  // accès retiré continuait de délivrer des URL de lecture signées, alors que
  // la page module (`mon-espace/module/[slug]`) le refusait déjà.
  const acces = await trouverAcces(utilisateur.id, moduleTrouve.id)
  if (!acces || acces.revoqueLe) {
    throw createError({ statusCode: 403, statusMessage: 'Ce module ne fait pas partie de vos accès' })
  }

  const chapitres = await Promise.all(
    moduleTrouve.chapitres.map(async (chapitre, position) => ({
      position,
      dureeSecondes: chapitre.videoDureeSecondes ?? null,
      // Le lecteur ne prend pas le même chemin selon la forme : hls.js pour un
      // flux transcodé, la balise vidéo seule pour un fichier unique. Deviner
      // à l'extension de l'URL rendrait la règle implicite — et l'URL porte
      // une chaîne de requête.
      format: chapitre.videoFormat ?? null,
      // Un chapitre sans vidéo montée renvoie `null` : le lecteur affiche son
      // écran d'attente plutôt qu'une erreur.
      url: chapitre.videoCle
        ? await urlLectureSignee(chapitre.videoCle, utilisateur.id, chapitre.videoFormat ?? 'hls')
        : null,
    })),
  )

  return { chapitres, expireDansSecondes: DUREE_AUTORISATION_SECONDES }
})
