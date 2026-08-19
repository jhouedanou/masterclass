import { formateurs, modules, sessionsCoaching, thematiques } from '../../data/db'
import { exigerAdmin } from '../../utils/session'

export default defineEventHandler((event) => {
  exigerAdmin(event)
  const { programme, statut } = getQuery(event) as Record<string, string | undefined>

  return sessionsCoaching
    .filter((s) => !programme || s.programme === programme)
    .filter((s) => !statut || s.statut === statut)
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
