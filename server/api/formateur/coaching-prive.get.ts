import { listerModules, trouverFormateur } from '../../database/catalogue'
import {
  listerDemandesCoachingPriveFormateur,
  listerHistoriqueCoachingPrive,
} from '../../database/coaching'
import { exigerFormateur } from '../../utils/session'

/**
 * Séances de coaching privé du formateur (planche D, écran 05). La section est
 * verrouillée tant que l'administration n'a pas activé l'accès : la réponse
 * porte alors `actif: false` et aucune séance — la page affiche l'état
 * verrouillé sans quitter son gabarit.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerFormateur(event)
  const formateur = utilisateur.formateurId ? await trouverFormateur(utilisateur.formateurId) : null

  if (!formateur?.coachingPriveActif) return { actif: false, seances: [] }

  const [demandes, modules] = await Promise.all([
    listerDemandesCoachingPriveFormateur(formateur.id),
    listerModules(),
  ])
  const historique = await listerHistoriqueCoachingPrive(demandes.map((d) => d.id))

  return {
    actif: true,
    seances: demandes
      // Les demandes refusées ou retirées ne concernent pas le formateur.
      .filter((d) => d.statut !== 'refusee' && d.statut !== 'annulee')
      .map((d) => ({
        id: d.id,
        apprenant: d.apprenant,
        utilisateurId: d.utilisateurId,
        module: modules.find((m) => m.id === d.moduleId)?.titre ?? '—',
        creneau: d.creneau ?? null,
        creneaux: d.creneaux,
        dureeMinutes: d.heures * 60,
        statut: d.statut,
        paye: d.statut === 'payee' || d.statut === 'realisee',
        lienSession: d.lienSession ?? null,
        sujets: d.besoins,
        historique: historique.filter((h) => h.demandeId === d.id),
      })),
  }
})
