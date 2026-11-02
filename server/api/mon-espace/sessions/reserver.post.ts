import { listerThematiques, trouverFormateur } from '../../../database/catalogue'
import { reserverPlace, trouverSession } from '../../../database/coaching'
import { notifier } from '../../../utils/notifications'
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

  // Confirmation par e-mail, avec l'accès à la salle : la réservation n'en
  // envoyait aucune. Pas de lien Zoom en clair (planche C, écran 03).
  const session = await trouverSession(sessionId)
  if (session) {
    const [thematiques, formateur] = await Promise.all([listerThematiques(), trouverFormateur(session.formateurId)])
    await notifier({
      canal: 'email',
      a: utilisateur.email,
      modele: 'session-reservee',
      variables: {
        prenom: utilisateur.prenom,
        titre: session.titre ?? thematiques.find((t) => t.id === session.thematiqueId)?.nom ?? 'Coaching collectif',
        date: session.date,
        heure: session.heure.slice(0, 5),
        formateur: formateur?.nom ?? '',
        salle: `/mon-espace/session/${session.id}`,
        ouvertureMinutes: String(session.ouvertureSalleMinutes),
      },
    })
  }

  return { ok: true, inscrits }
})
