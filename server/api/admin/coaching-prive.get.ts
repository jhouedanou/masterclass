import { listerFormateurs, listerModules } from '../../database/catalogue'
import { listerDemandesCoachingPrive } from '../../database/coaching'
import { statistiquesFormateurs } from '../../utils/formateur'
import { exigerAdmin } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await exigerAdmin(event)

  const [demandes, modules, formateurs, statistiques] = await Promise.all([
    listerDemandesCoachingPrive(),
    listerModules(),
    listerFormateurs(),
    statistiquesFormateurs(),
  ])

  return {
    demandes: demandes.map((d) => {
      const moduleTrouve = modules.find((m) => m.id === d.moduleId)
      // Le tarif horaire est porté par le formateur du module concerné.
      const tarif =
        formateurs.find((f) => f.id === moduleTrouve?.formateurId)?.coachingPriveFcfaHeure ?? 0
      return {
        ...d,
        module: moduleTrouve?.titre ?? '—',
        montant: d.heures * tarif,
      }
    }),
    statistiquesFormateurs: statistiques,
  }
})
