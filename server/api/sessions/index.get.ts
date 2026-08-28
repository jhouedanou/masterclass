import { listerFormateurs, listerThematiques } from '../../database/catalogue'
import { listerSessions } from '../../database/coaching'

export default defineEventHandler(async () => {
  const [sessions, thematiques, formateurs] = await Promise.all([
    listerSessions(),
    listerThematiques(),
    listerFormateurs(),
  ])

  return sessions.map((s) => ({
    ...s,
    thematique: thematiques.find((t) => t.id === s.thematiqueId) ?? null,
    formateur: formateurs.find((f) => f.id === s.formateurId) ?? null,
  }))
})
