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

  // État verrouillé : la page affiche l'explication et le bouton « Demander
  // l'activation », grisé si la demande est déjà partie.
  if (!formateur?.coachingPriveActif) {
    return {
      actif: false,
      tarifFcfaHeure: formateur?.coachingPriveFcfaHeure ?? 50_000,
      activationDemandeeLe: formateur?.activationCoachingDemandeeLe ?? null,
      seances: [],
    }
  }

  const [demandes, modules] = await Promise.all([
    listerDemandesCoachingPriveFormateur(formateur.id),
    listerModules(),
  ])
  const historique = await listerHistoriqueCoachingPrive(demandes.map((d) => d.id))

  return {
    actif: true,
    tarifFcfaHeure: formateur.coachingPriveFcfaHeure,
    activationDemandeeLe: formateur.activationCoachingDemandeeLe ?? null,
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
        heures: d.heures,
        dureeMinutes: d.heures * 60,
        statut: d.statut,
        paye: d.statut === 'payee' || d.statut === 'realisee',
        lienSession: d.lienSession ?? null,
        sujets: d.besoins,
        // « Événement Google Agenda créé — rappels automatiques » : la mention
        // n'apparaît que si l'événement existe réellement.
        agendaCree: Boolean(d.evenementAgendaId),
        historique: historique.filter((h) => h.demandeId === d.id),
      })),
  }
})
