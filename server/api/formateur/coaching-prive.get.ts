import { listerModules } from '../../database/catalogue'
import { listerDemandesCoachingPrive } from '../../database/coaching'
import { exigerFormateur } from '../../utils/session'

/**
 * Séances de coaching privé du formateur — planification et paiement gérés par
 * l'équipe. Le statut détaillé de la base est projeté sur les trois états
 * qu'affiche l'écran, l'encaissement étant porté à part.
 */
const PROJECTION = {
  'en-attente': { statut: 'en-attente', paye: false },
  'confirmee-attente-paiement': { statut: 'confirmee', paye: false },
  payee: { statut: 'confirmee', paye: true },
  realisee: { statut: 'realisee', paye: true },
} as const

export default defineEventHandler(async (event) => {
  const utilisateur = await exigerFormateur(event)

  const [demandes, modules] = await Promise.all([listerDemandesCoachingPrive(), listerModules()])
  const siens = new Set(
    modules.filter((m) => m.formateurId === utilisateur.formateurId).map((m) => m.id),
  )

  return demandes
    .filter((d) => siens.has(d.moduleId))
    .map((d) => ({
      id: d.id,
      apprenant: d.apprenant,
      // Aucune date ferme n'est stockée : le créneau retenu par l'équipe est un
      // texte libre, affiché tel quel.
      date: null,
      creneau: d.creneau ?? null,
      dureeMinutes: d.heures * 60,
      ...PROJECTION[d.statut],
      sujets: d.besoins,
    }))
})
