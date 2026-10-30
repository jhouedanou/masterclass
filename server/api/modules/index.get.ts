import { listerFormateurs, listerModules, listerThematiques } from '../../database/catalogue'
import { contexteLivePublic, statutModuleAffiche } from '../../utils/live'
import { formateurPublic, modulePublic } from '../../utils/public'

export default defineEventHandler(async (event) => {
  const { programme, thematique } = getQuery(event) as Record<string, string | undefined>

  const [modules, formateurs, thematiques, live] = await Promise.all([
    listerModules(),
    listerFormateurs(),
    listerThematiques(),
    contexteLivePublic(event),
  ])

  const parFormateur = new Map(formateurs.map((f) => [f.id, formateurPublic(f)]))
  const parThematique = new Map(thematiques.map((t) => [t.id, t]))

  return modules
    .filter((m) => m.statut !== 'brouillon')
    .filter((m) => !programme || m.programme === programme)
    .filter((m) => !thematique || m.thematiqueId === thematique)
    .map((m) => ({
      ...modulePublic(m),
      // Live Session (CDC §5.3) : badge et CTA « S'inscrire » vers la fiche ;
      // « À venir » tant que la fonctionnalité est masquée (10.G).
      statut: statutModuleAffiche(m.statut, live.visible),
      live: live.parModule.get(m.id) ?? null,
      formateur: parFormateur.get(m.formateurId) ?? null,
      thematique: parThematique.get(m.thematiqueId) ?? null,
    }))
})
