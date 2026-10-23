import { listerFormateurs, listerModules } from '../../database/catalogue'
import { listerDemandesCoachingPrive, listerHistoriqueCoachingPrive } from '../../database/coaching'
import { statistiquesFormateurs } from '../../utils/formateur'
import { exigerUneSection } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await exigerUneSection(event, ['coaching-prive', 'statistiques-performance'])

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
        // Le tarif horaire est porté par le formateur choisi ; c'est lui que
        // la confirmation multiplie et que FeexPay encaisse. Une fois la
        // demande confirmée, le montant enregistré fait foi.
        tarifHoraire: formateur?.coachingPriveFcfaHeure ?? 50_000,
        montant: d.montantFcfa ?? d.heures * (formateur?.coachingPriveFcfaHeure ?? 50_000),
        historique: historique.filter((h) => h.demandeId === d.id),
      }
    }),
    statistiquesFormateurs: statistiques,
  }
})
