import {
  listerFormateurs,
  listerModules,
  listerThematiques,
  trouverProgramme,
} from '../../database/catalogue'
import { compteursProgramme, formateurPublic, modulePublic, programmePublic } from '../../utils/public'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const programme = await trouverProgramme(slug ?? '')
  if (!programme) {
    throw createError({ statusCode: 404, statusMessage: 'Programme introuvable' })
  }

  const [thematiques, modules, formateurs] = await Promise.all([
    listerThematiques(),
    listerModules(),
    listerFormateurs(),
  ])

  const parFormateur = new Map(formateurs.map((f) => [f.id, formateurPublic(f)]))

  return {
    // Les textes du programme portent des jetons de décompte : ils deviennent
    // des nombres ici, pour la page comme pour ses métadonnées.
    programme: programmePublic(programme, compteursProgramme(programme.slug, modules, thematiques)),
    // Les thématiques sont des sections de la page programme (spec SEO §1).
    thematiques: thematiques
      .filter((t) => t.programme === programme.slug)
      .sort((a, b) => a.numero - b.numero)
      .map((t) => ({
        ...t,
        modules: modules
          .filter((m) => m.thematiqueId === t.id && m.statut !== 'brouillon')
          .sort((a, b) => a.numero - b.numero)
          .map((m) => ({
            ...modulePublic(m),
            formateur: parFormateur.get(m.formateurId) ?? null,
          })),
      })),
  }
})
