import { enregistrerJournal } from '../../../../database/administration'
import { majModule, trouverModule } from '../../../../database/catalogue'
import {
  SEAU_COUVERTURES,
  cheminDansSeau,
  effacerImage,
  lireImageDeposee,
  televerserImage,
  urlPhoto,
} from '../../../../utils/photos'
import { exigerUneSection } from '../../../../utils/session'

/**
 * Dépôt de la couverture d'un module (écran 02B, bloc 1).
 *
 * L'image sert trois fois : le visuel de la fiche, la vignette de la carte au
 * catalogue, et l'image de partage sur les réseaux. D'où le format demandé,
 * 1200 × 630 — celui qu'Open Graph réclame, et que les deux autres usages
 * recadrent sans perte visible.
 *
 * Le fichier n'est pas redimensionné ici : le back-office annonce le format
 * attendu, et une image déposée hors ratio se verra au premier coup d'œil sur
 * l'aperçu. Recadrer à la volée demanderait une bibliothèque d'images côté
 * serveur pour un gain que la relecture humaine donne déjà.
 */
export default defineEventHandler(async (event) => {
  // La couverture se dépose depuis la fiche commerciale.
  const admin = await exigerUneSection(event, ['modules-chapitres', 'fiches-commerciales'])

  const parties = await lireImageDeposee(event, SEAU_COUVERTURES, 'image')
  const moduleId = getRouterParam(event, 'id') ?? ''

  const module = await trouverModule(moduleId)
  if (!module) throw createError({ statusCode: 404, statusMessage: 'Module introuvable' })

  const chemin = await televerserImage(SEAU_COUVERTURES, module.id, parties.contenu, parties.format)
  const url = urlPhoto(SEAU_COUVERTURES, chemin)
  if (!url) {
    await effacerImage(SEAU_COUVERTURES, chemin)
    throw createError({ statusCode: 500, statusMessage: 'Adresse du stockage introuvable' })
  }

  let modifie
  try {
    modifie = await majModule(module.id, { image: url })
  } catch (erreur) {
    // La base a refusé : le fichier tout juste déposé n'est rattaché à rien.
    await effacerImage(SEAU_COUVERTURES, chemin)
    throw erreur
  }

  // L'ancienne couverture ne part qu'une fois la nouvelle en place, et
  // seulement si elle venait bien du seau.
  await effacerImage(SEAU_COUVERTURES, cheminDansSeau(SEAU_COUVERTURES, module.image))

  await enregistrerJournal(`${admin.prenom} ${admin.nom}`, 'a changé la couverture du module', modifie.titre)
  return modifie
})
