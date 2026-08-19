import { formateurs, modules, sessionsCoaching } from '../../data/db'
import { exigerAdmin } from '../../utils/session'

export default defineEventHandler((event) => {
  exigerAdmin(event)

  return formateurs.map((f, i) => {
    const siens = modules.filter((m) => m.formateurId === f.id)
    return {
      ...f,
      nbModules: siens.length,
      nbProgrammes: new Set(siens.map((m) => m.programme)).size,
      ordrePublic: i + 1,
      // La suppression est bloquée tant que des modules publiés ou des sessions
      // à venir lui sont rattachés.
      supprimable:
        !siens.some((m) => m.statut === 'disponible') &&
        !sessionsCoaching.some((s) => s.formateurId === f.id && s.statut === 'planifiee'),
      sessionsAVenir: sessionsCoaching.filter(
        (s) => s.formateurId === f.id && s.statut === 'planifiee',
      ).length,
    }
  })
})
