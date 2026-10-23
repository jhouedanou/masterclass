import { motifsBlocageSuppression } from '#shared/utils/suppressionFormateur'
import { bloquantsSuppressionFormateurs, listerFormateurs, listerModules } from '../../database/catalogue'
import { listerSessions } from '../../database/coaching'
import { listerUtilisateurs } from '../../database/comptes'
import { exigerSection } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await exigerSection(event, 'formateurs')

  const [formateurs, modules, sessions, utilisateurs, bloquants] = await Promise.all([
    listerFormateurs(),
    listerModules(),
    listerSessions(),
    listerUtilisateurs(),
    bloquantsSuppressionFormateurs(),
  ])

  return formateurs.map((f, i) => {
    const siens = modules.filter((m) => m.formateurId === f.id)
    const aVenir = sessions.filter((s) => s.formateurId === f.id && s.statut === 'planifiee')
    const b = bloquants.get(f.id)
    // Les mêmes décomptes que la route de suppression : la modale dit avant le
    // clic ce que la route refuserait. L'ancien critère (« ni module publié ni
    // session à venir ») laissait croire supprimable un formateur que la base
    // refusait d'effacer.
    const motifsBlocage = b ? motifsBlocageSuppression(b) : []
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
      motifsBlocage,
      supprimable: !motifsBlocage.length,
      sessionsAVenir: aVenir.length,
    }
  })
})
