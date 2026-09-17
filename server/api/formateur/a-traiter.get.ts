import { listerDemandesCoachingPriveFormateur } from '../../database/coaching'
import { exigerFormateur } from '../../utils/session'

/**
 * Pastille « Coaching privé 2 » de la navigation (planche D, écran 01).
 *
 * Elle est posée par le gabarit de l'espace formateur, donc sur **chaque** page
 * de l'espace. Elle appelait `aTraiterFormateur`, qui lit les séances, les
 * thématiques, les notes, les sujets de la prochaine session et les demandes —
 * six requêtes, pour afficher un chiffre. Sur la vue d'ensemble, le même calcul
 * repartait une seconde fois côté page.
 *
 * Le compteur, lui, ne tient qu'aux séances privées payées qu'il reste à
 * animer : une requête suffit. Les trois compteurs du bloc « À traiter »
 * restent servis par `/api/formateur/tableau-bord`, où ils se calculent sur des
 * données déjà chargées pour l'écran.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerFormateur(event)
  const demandes = await listerDemandesCoachingPriveFormateur(utilisateur.formateurId!)
  return { coachingPrive: demandes.filter((d) => d.statut === 'payee').length }
})
