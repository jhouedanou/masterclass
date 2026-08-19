import { formateurs, modules, thematiques } from '../../data/db'

export default defineEventHandler((event) => {
  const { programme, thematique } = getQuery(event) as Record<string, string | undefined>

  return modules
    .filter((m) => m.statut !== 'brouillon')
    .filter((m) => !programme || m.programme === programme)
    .filter((m) => !thematique || m.thematiqueId === thematique)
    .map((m) => ({
      ...m,
      formateur: formateurs.find((f) => f.id === m.formateurId) ?? null,
      thematique: thematiques.find((t) => t.id === m.thematiqueId) ?? null,
    }))
})
