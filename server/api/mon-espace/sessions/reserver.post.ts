import { reserverPlace } from '../../../database/coaching'
import { exigerUtilisateur } from '../../../utils/session'

/**
 * Réservation d'une place en coaching collectif.
 *
 * Les trois conditions cumulatives — posséder un module de la thématique, avoir
 * une fiche apprenant complète, soumettre ses sujets — sont vérifiées par la
 * fonction `reserver_place_session`, qui verrouille la session le temps de
 * l'opération. Deux réservations simultanées sur la dernière place ne peuvent
 * donc plus passer toutes les deux.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const { sessionId, preoccupation, attente } = await readBody<{
    sessionId: string
    preoccupation: string
    attente: string
  }>(event)

  const inscrits = await reserverPlace({
    sessionId,
    utilisateurId: utilisateur.id,
    preoccupation,
    attente,
    // Forme abrégée transmise au formateur avec les sujets.
    apprenant: `${utilisateur.prenom} ${utilisateur.nom[0]}.`,
  })

  return { ok: true, inscrits }
})
