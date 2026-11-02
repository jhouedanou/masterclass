import {
  listerFormateurs,
  listerModules,
  listerThematiques,
  trouverProgramme,
} from '../../database/catalogue'
import { contexteLivePublic, statutModuleAffiche } from '../../utils/live'
import { compteursProgramme, formateurPublic, modulePublic, programmePublic } from '../../utils/public'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const programme = await trouverProgramme(slug ?? '')
  if (!programme) {
    throw createError({ statusCode: 404, statusMessage: 'Programme introuvable' })
  }

  const [thematiques, modules, formateurs, live] = await Promise.all([
    listerThematiques(),
    listerModules(),
    listerFormateurs(),
    contexteLivePublic(event),
  ])

  const parFormateur = new Map(formateurs.map((f) => [f.id, formateurPublic(f)]))

  return {
    // Les textes du programme portent des jetons de décompte : ils deviennent
    // des nombres ici, pour la page comme pour ses métadonnées.
    programme: programmePublic(programme, compteursProgramme(programme.slug, modules, thematiques)),
    // Les thématiques sont des sections de la page programme (spec SEO §1).
    // Modules disponibles, en Live Session et annoncés : la page les filtre
    // (Tous / Disponibles / Live Sessions / Bientôt disponibles, CDC §5.3).
    // Une thématique sans aucun d'eux n'est pas montrée.
    thematiques: thematiques
      .filter((t) => t.programme === programme.slug)
      .sort((a, b) => a.numero - b.numero)
      .map((t) => ({
        ...t,
        modules: modules
          .filter((m) => m.thematiqueId === t.id && ['disponible', 'live-session', 'annonce'].includes(m.statut))
          .sort((a, b) => a.numero - b.numero)
          .map((m) => ({
            ...modulePublic(m),
            statut: statutModuleAffiche(m.statut, live.visible),
            live: live.parModule.get(m.id) ?? null,
            formateur: parFormateur.get(m.formateurId) ?? null,
          })),
      }))
      .filter((t) => t.modules.length > 0),
  }
})
