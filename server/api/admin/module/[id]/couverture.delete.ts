import { enregistrerJournal } from '../../../../database/administration'
import { majModule, trouverModule } from '../../../../database/catalogue'
import { SEAU_COUVERTURES, cheminDansSeau, effacerImage } from '../../../../utils/photos'
import { exigerUneSection } from '../../../../utils/session'

/** Retrait de la couverture : la fiche retombe sur le visuel du programme. */
export default defineEventHandler(async (event) => {
  const admin = await exigerUneSection(event, ['modules-chapitres', 'fiches-commerciales'])
  const module = await trouverModule(getRouterParam(event, 'id') ?? '')
  if (!module) throw createError({ statusCode: 404, statusMessage: 'Module introuvable' })

  // La référence part d'abord : un fichier orphelin dans le seau est sans
  // conséquence, une fiche pointant vers un fichier effacé est une image morte.
  const modifie = await majModule(module.id, { image: '', imageAlt: '' })
  await effacerImage(SEAU_COUVERTURES, cheminDansSeau(SEAU_COUVERTURES, module.image))

  await enregistrerJournal(`${admin.prenom} ${admin.nom}`, 'a retiré la couverture du module', modifie.titre)
  return modifie
})
