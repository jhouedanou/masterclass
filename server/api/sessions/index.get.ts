import { formateurs, sessionsCoaching, thematiques } from '../../data/db'

export default defineEventHandler(() =>
  sessionsCoaching.map((s) => ({
    ...s,
    thematique: thematiques.find((t) => t.id === s.thematiqueId) ?? null,
    formateur: formateurs.find((f) => f.id === s.formateurId) ?? null,
  })),
)
