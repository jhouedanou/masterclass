import { listerFormateurs, listerModules, listerThematiques } from '../../database/catalogue'
import { formateurPublic, modulePublic } from '../../utils/public'

export default defineEventHandler(async (event) => {
  const { programme, thematique } = getQuery(event) as Record<string, string | undefined>

  const [modules, formateurs, thematiques] = await Promise.all([
    listerModules(),
    listerFormateurs(),
    listerThematiques(),
  ])

  const parFormateur = new Map(formateurs.map((f) => [f.id, formateurPublic(f)]))
  const parThematique = new Map(thematiques.map((t) => [t.id, t]))

  return modules
    .filter((m) => m.statut !== 'brouillon')
    .filter((m) => !programme || m.programme === programme)
    .filter((m) => !thematique || m.thematiqueId === thematique)
    .map((m) => ({
      ...modulePublic(m),
      formateur: parFormateur.get(m.formateurId) ?? null,
      thematique: parThematique.get(m.thematiqueId) ?? null,
    }))
})
