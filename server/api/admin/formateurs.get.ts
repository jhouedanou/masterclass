import { listerFormateurs, listerModules } from '../../database/catalogue'
import { listerSessions } from '../../database/coaching'
import { exigerAdmin } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await exigerAdmin(event)

  const [formateurs, modules, sessions] = await Promise.all([
    listerFormateurs(),
    listerModules(),
    listerSessions(),
  ])

  return formateurs.map((f, i) => {
    const siens = modules.filter((m) => m.formateurId === f.id)
    const aVenir = sessions.filter((s) => s.formateurId === f.id && s.statut === 'planifiee')
    return {
      ...f,
      nbModules: siens.length,
      nbProgrammes: new Set(siens.map((m) => m.programme)).size,
      ordrePublic: i + 1,
      // La suppression est bloquée tant que des modules publiés ou des sessions
      // à venir lui sont rattachés.
      supprimable: !siens.some((m) => m.statut === 'disponible') && !aVenir.length,
      sessionsAVenir: aVenir.length,
    }
  })
})
