import {
  acces,
  inscriptionsSessions,
  modules,
  sessionsCoaching,
  sujetsSessions,
} from '../../../data/db'
import { exigerUtilisateur } from '../../../utils/session'

/**
 * Réservation d'une place en coaching collectif.
 * Trois conditions cumulatives : posséder un module de la thématique, avoir une
 * fiche apprenant complète, et soumettre ses sujets — ces réponses sont
 * transmises au formateur avant la séance.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = exigerUtilisateur(event)
  const { sessionId, preoccupation, attente } = await readBody<{
    sessionId: string
    preoccupation: string
    attente: string
  }>(event)

  const session = sessionsCoaching.find((s) => s.id === sessionId)
  if (!session || session.statut !== 'planifiee') {
    throw createError({ statusCode: 404, statusMessage: 'Session introuvable ou annulée' })
  }
  if (!preoccupation?.trim() || !attente?.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'Les deux réponses sont obligatoires' })
  }
  if (utilisateur.ficheCompletee !== true) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Complétez votre fiche apprenant avant de réserver',
    })
  }

  const modulesCouverts = modules
    .filter((m) => m.thematiqueId === session.thematiqueId)
    .map((m) => m.id)
  const eligible = acces.some(
    (a) => a.utilisateurId === utilisateur.id && modulesCouverts.includes(a.moduleId),
  )
  if (!eligible) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Cette session est réservée aux acheteurs d’un module de la thématique',
    })
  }
  if (session.inscrits >= session.places) {
    throw createError({ statusCode: 409, statusMessage: 'Session complète' })
  }
  if (inscriptionsSessions.some((i) => i.sessionId === sessionId && i.utilisateurId === utilisateur.id)) {
    throw createError({ statusCode: 409, statusMessage: 'Vous êtes déjà inscrit à cette session' })
  }

  inscriptionsSessions.push({
    sessionId,
    utilisateurId: utilisateur.id,
    inscritLe: new Date().toISOString().slice(0, 10),
  })
  session.inscrits += 1

  sujetsSessions.push({
    id: `suj-${sujetsSessions.length + 1}`,
    sessionId,
    utilisateurId: utilisateur.id,
    apprenant: `${utilisateur.prenom} ${utilisateur.nom[0]}.`,
    preoccupation: preoccupation.trim(),
    attente: attente.trim(),
    soumisLe: new Date().toISOString().slice(0, 10),
  })

  return { ok: true, inscrits: session.inscrits }
})
