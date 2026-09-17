import { listerFormateurs, listerModules } from '../../database/catalogue'
import { listerSessions } from '../../database/coaching'
import { listerUtilisateurs } from '../../database/comptes'
import { exigerSection } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await exigerSection(event, 'formateurs')

  const [formateurs, modules, sessions, utilisateurs] = await Promise.all([
    listerFormateurs(),
    listerModules(),
    listerSessions(),
    listerUtilisateurs(),
  ])

  return formateurs.map((f, i) => {
    const siens = modules.filter((m) => m.formateurId === f.id)
    const aVenir = sessions.filter((s) => s.formateurId === f.id && s.statut === 'planifiee')
    return {
      ...f,
      nbModules: siens.length,
      nbProgrammes: new Set(siens.map((m) => m.programme)).size,
      ordrePublic: i + 1,
      // L'écran 11 montre une colonne « Accès » : un formateur sans compte
      // rattaché ne peut pas entrer dans son espace, et rien ne le disait.
      compte: (() => {
        const u = utilisateurs.find((x) => x.formateurId === f.id)
        return u ? { email: u.email, aUnMotDePasse: true } : null
      })(),
      // La suppression est bloquée tant que des modules publiés ou des sessions
      // à venir lui sont rattachés.
      supprimable: !siens.some((m) => m.statut === 'disponible') && !aVenir.length,
      sessionsAVenir: aVenir.length,
    }
  })
})
