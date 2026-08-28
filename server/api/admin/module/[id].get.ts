import { listerRessources, listerVersions } from '../../../database/backoffice'
import {
  listerChapitres,
  listerFormateurs,
  listerThematiques,
  trouverModule,
} from '../../../database/catalogue'
import { exigerSection } from '../../../utils/session'

/** Éditeur d'un module : ses cinq onglets en une seule requête. */
export default defineEventHandler(async (event) => {
  await exigerSection(event, 'modules-chapitres')
  const id = getRouterParam(event, 'id') ?? ''

  const moduleTrouve = await trouverModule(id)
  if (!moduleTrouve) {
    throw createError({ statusCode: 404, statusMessage: 'Module introuvable' })
  }

  const [chapitres, ressources, thematiques, formateurs, versions] = await Promise.all([
    listerChapitres(id),
    listerRessources(id),
    listerThematiques(),
    listerFormateurs(),
    listerVersions('modules', id, 20),
  ])

  return {
    module: moduleTrouve,
    chapitres,
    ressources,
    thematiques,
    formateurs,
    versions,
    // Conditions d'ouverture de l'offre, affichées avant que le bouton ne soit
    // proposé — plutôt qu'un refus après coup.
    peutOuvrirOffre:
      Boolean(moduleTrouve.promesse) && Boolean(moduleTrouve.pourquoi) && chapitres.length > 0,
  }
})
