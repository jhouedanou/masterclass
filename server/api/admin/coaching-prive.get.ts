import { listerFormateurs, listerModules } from '../../database/catalogue'
import { listerDemandesCoachingPrive, listerHistoriqueCoachingPrive } from '../../database/coaching'
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
  const historique = await listerHistoriqueCoachingPrive(demandes.map((d) => d.id))

  return {
    demandes: demandes.map((d) => {
      const formateur = formateurs.find((f) => f.id === d.formateurId)
      return {
        ...d,
        module: modules.find((m) => m.id === d.moduleId)?.titre ?? '—',
        formateur: formateur?.nom ?? '—',
        // Le tarif horaire est porté par le formateur choisi.
        montant: d.heures * (formateur?.coachingPriveFcfaHeure ?? 0),
        historique: historique.filter((h) => h.demandeId === d.id),
      }
    }),
    statistiquesFormateurs: statistiques,
  }
})
