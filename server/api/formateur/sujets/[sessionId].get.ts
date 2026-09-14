import { listerThematiques } from '../../../database/catalogue'
import {
  listerInscritsSession,
  listerSujetsSession,
  marquerSujetsLus,
  trouverSession,
} from '../../../database/coaching'
import { exigerFormateur } from '../../../utils/session'

/**
 * « Les 19 réponses → » et « Cliquer "inscrits" ouvre la liste avec accès aux
 * fiches profils » (planche D, écrans 01 et 04).
 *
 * Ouvrir la liste vaut lecture : le compteur « Sujets à lire » du bloc
 * « À traiter » retombe. Seules les sessions du formateur sont accessibles.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerFormateur(event)
  const sessionId = getRouterParam(event, 'sessionId') ?? ''

  const session = await trouverSession(sessionId)
  if (!session) throw createError({ statusCode: 404, statusMessage: 'Session introuvable' })
  if (session.formateurId !== utilisateur.formateurId) {
    throw createError({ statusCode: 403, statusMessage: 'Cette session n’est pas la vôtre' })
  }

  const [sujets, inscrits, thematiques] = await Promise.all([
    listerSujetsSession(session.id),
    listerInscritsSession(session.id),
    listerThematiques(),
  ])

  await marquerSujetsLus(session.id)

  const avecSujet = new Set(sujets.map((s) => s.utilisateurId))

  return {
    session: {
      id: session.id,
      date: session.date,
      heure: session.heure,
      inscrits: session.inscrits,
      places: session.places,
      titre: session.titre ?? '',
      thematique: thematiques.find((t) => t.id === session.thematiqueId)?.nom ?? '',
    },
    sujets: sujets.map((s) => ({
      id: s.id,
      utilisateurId: s.utilisateurId,
      apprenant: s.apprenant,
      preoccupation: s.preoccupation,
      attente: s.attente,
      soumisLe: s.soumisLe,
      // État avant l'ouverture : la page signale ce qui vient d'arriver.
      nouveau: !s.luLe,
    })),
    // Coordonnées masquées : la fiche apprenant est le seul détail accessible.
    inscrits: inscrits.map((u) => ({
      id: u.id,
      nom: `${u.prenom} ${u.nom[0] ?? ''}.`,
      sujetSoumis: avecSujet.has(u.id),
    })),
  }
})
