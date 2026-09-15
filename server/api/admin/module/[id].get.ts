import { listerRessources, listerVersions } from '../../../database/backoffice'
import { televersementEnCours } from '../../../database/video'
import {
  listerChapitres,
  listerFormateurs,
  listerThematiques,
  trouverModule,
} from '../../../database/catalogue'
import { checklistPret } from '../../../utils/pret'
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

  // Un dépôt peut avoir été lancé depuis un autre poste, ou dans un onglet
  // fermé : l'éditeur doit le montrer plutôt que de proposer d'en ouvrir un
  // second, que l'index unique refuserait.
  const depots = await Promise.all(
    chapitres.map(async (c) => [c.id, await televersementEnCours(c.id)] as const),
  )

  return {
    module: moduleTrouve,
    chapitres: chapitres.map((c) => ({
      ...c,
      depotEnCours: depots.find(([id]) => id === c.id)?.[1] ?? null,
    })),
    ressources,
    thematiques,
    formateurs,
    versions,
    // Conditions d'ouverture de l'offre, affichées avant que le bouton ne soit
    // proposé — plutôt qu'un refus après coup.
    peutOuvrirOffre:
      Boolean(moduleTrouve.promesse) && Boolean(moduleTrouve.pourquoi) && chapitres.length > 0,
    checklist: checklistPret(moduleTrouve, chapitres),
  }
})
