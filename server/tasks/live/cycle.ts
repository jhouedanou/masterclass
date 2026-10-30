import { DELAIS_LIVE } from '#shared/utils/live'
import { enregistrerJournal } from '../../database/administration'
import {
  expirerReservationsLive,
  expirerReservationsSessionLive,
  listerSessionsLive,
  transitionnerSessionLive,
} from '../../database/live'
import {
  envoyerFinLive,
  envoyerFormateurPlanifieeLive,
  envoyerFormateurRappelLive,
  envoyerRappelsLive,
} from '../../utils/emailsLive'

const MINUTE = 60_000
/** H0 reste rattrapable un quart d'heure après le début, pas au-delà. */
const TOLERANCE_H0_MINUTES = 15

/**
 * Cycle des Live Sessions, toutes les 5 minutes (CDC §7) :
 * - réservations échues → expirées (la place est libérée) ;
 * - publiée → en cours à l'heure de début (inscriptions closes) ;
 * - en cours → terminée au début + durée + 60 min, si l'admin ne l'a pas
 *   marquée avant (quiz et coaching ouverts, support visible) ;
 * - e-mails : rappels J-1, H-10 et H0 aux inscrits, rappel J-1 au formateur,
 *   fin de session quand le support est là.
 *
 * Chaque envoi est conditionné par son horodatage : une passe relancée ou
 * concurrente n'envoie rien deux fois. Un envoi manqué reste rattrapable
 * dans sa fenêtre ; une fenêtre passée ne se rattrape pas.
 */
export async function cycleLiveSessions(maintenant = Date.now()) {
  const bilan = { expirees: 0, demarrees: 0, terminees: 0, rappels: 0, fins: 0, erreurs: 0 }
  bilan.expirees = await expirerReservationsLive()

  const sessions = await listerSessionsLive({ statuts: ['publiee', 'en-cours', 'terminee'] })
  for (const session of sessions) {
    try {
      const debut = new Date(session.debut).getTime()
      const fin = debut + session.dureeMinutes * MINUTE

      if (session.statut === 'publiee' || session.statut === 'en-cours') {
        if (session.statut === 'publiee') await envoyerFormateurPlanifieeLive(session)

        if (maintenant >= debut - DELAIS_LIVE.lienApprenantMinutes * MINUTE && maintenant < debut - DELAIS_LIVE.rappelMinutes * MINUTE) {
          bilan.rappels += await envoyerRappelsLive(session, 'envoye_j1_le')
          await envoyerFormateurRappelLive(session)
        }
        if (maintenant >= debut - DELAIS_LIVE.rappelMinutes * MINUTE && maintenant < debut) {
          bilan.rappels += await envoyerRappelsLive(session, 'envoye_m10_le')
        }
        if (maintenant >= debut && maintenant < debut + TOLERANCE_H0_MINUTES * MINUTE) {
          bilan.rappels += await envoyerRappelsLive(session, 'envoye_h0_le')
        }

        if (session.statut === 'publiee' && maintenant >= debut) {
          if (await transitionnerSessionLive(session.id, ['publiee'], 'en-cours')) {
            await expirerReservationsSessionLive(session.id)
            bilan.demarrees++
          }
        }

        if (maintenant >= fin + DELAIS_LIVE.finAutomatiqueMinutes * MINUTE) {
          const termineLe = new Date(maintenant).toISOString()
          if (await transitionnerSessionLive(session.id, ['publiee', 'en-cours'], 'terminee', { termine_le: termineLe })) {
            bilan.terminees++
            await enregistrerJournal('Tâche planifiée', 'a marqué terminée la Live Session', session.slug, {
              type: 'session',
              objet: 'live-session',
            })
            bilan.fins += await envoyerFinLive({ ...session, statut: 'terminee', termineLe })
          }
        }
      } else if (session.statut === 'terminee' && session.supportNom) {
        // Fin de session : rattrapage des envois, ou support ajouté après coup.
        bilan.fins += await envoyerFinLive(session)
      }
    } catch (e) {
      bilan.erreurs++
      console.error(`[live] ${session.slug} :`, (e as Error).message)
    }
  }
  return bilan
}

export default defineTask({
  meta: { name: 'live:cycle', description: 'Live Sessions : réservations, transitions et rappels (CDC §7)' },
  run: async () => ({ result: await cycleLiveSessions() }),
})
