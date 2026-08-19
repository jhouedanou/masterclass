import { demandesCoachingPrive, formateurs, modules } from '../../data/db'
import { statistiquesModules } from '../../utils/formateur'
import { exigerAdmin } from '../../utils/session'

export default defineEventHandler((event) => {
  exigerAdmin(event)

  return {
    demandes: demandesCoachingPrive.map((d) => ({
      ...d,
      module: modules.find((m) => m.id === d.moduleId)?.titre ?? '—',
      montant: d.heures * 50_000,
    })),
    statistiquesFormateurs: formateurs.map((f) => {
      const siens = statistiquesModules(f.id).filter((m) => m.statut === 'disponible')
      return {
        id: f.id,
        nom: f.nom,
        nbModules: siens.length,
        inscrits: siens.reduce((s, m) => s + m.inscrits, 0),
        completion: siens.length
          ? Math.round(siens.reduce((s, m) => s + m.completion, 0) / siens.length)
          : 0,
        presence: 71 + (siens.length % 12),
        coachingPrive: demandesCoachingPrive.length,
      }
    }),
  }
})
