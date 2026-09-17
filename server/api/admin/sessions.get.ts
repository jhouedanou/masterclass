import { listerFormateurs, listerModules, listerThematiques } from '../../database/catalogue'
import { listerSessions } from '../../database/coaching'
import { exigerSection } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await exigerSection(event, 'calendrier-sessions')
  const { programme, statut, thematique, formateur } = getQuery(event) as Record<
    string,
    string | undefined
  >

  const [sessions, thematiques, formateurs, modules] = await Promise.all([
    listerSessions(),
    listerThematiques(),
    listerFormateurs(),
    listerModules(),
  ])

  return sessions
    .filter((s) => !programme || s.programme === programme)
    .filter((s) => !statut || s.statut === statut)
    .filter((s) => !thematique || s.thematiqueId === thematique)
    .filter((s) => !formateur || s.formateurId === formateur)
    .map((s) => ({
      ...s,
      thematique: thematiques.find((t) => t.id === s.thematiqueId) ?? null,
      formateur: formateurs.find((f) => f.id === s.formateurId) ?? null,
      // Modules couverts par la session : ceux de la thématique.
      modulesCouverts: modules
        .filter((m) => m.thematiqueId === s.thematiqueId && m.statut !== 'brouillon')
        .map((m) => m.numero),
    }))
})
