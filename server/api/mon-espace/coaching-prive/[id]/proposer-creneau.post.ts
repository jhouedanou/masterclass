import type { CreneauCoaching } from '#shared/types'
import { changerStatutDemandeCoachingPrive, trouverDemandeCoachingPrive } from '../../../../database/coaching'
import { exigerUtilisateur } from '../../../../utils/session'

/** « Proposer un autre créneau » (planche B, écran 10) : la demande repasse en étude avec le nouveau souhait. */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const id = getRouterParam(event, 'id') ?? ''
  const { creneau, message } = await readBody<{ creneau?: CreneauCoaching; message?: string }>(event)

  const demande = await trouverDemandeCoachingPrive(id)
  if (!demande || demande.utilisateurId !== utilisateur.id) {
    throw createError({ statusCode: 404, statusMessage: 'Demande introuvable' })
  }
  if (demande.statut !== 'confirmee-attente-paiement') {
    throw createError({ statusCode: 409, statusMessage: 'Aucune proposition en cours sur cette demande.' })
  }
  if (!creneau?.date || !creneau.debut || !creneau.fin) {
    throw createError({ statusCode: 422, statusMessage: 'Indiquez le créneau souhaité (jour, début, fin).' })
  }
  const libelle = `${new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${creneau.date}T00:00:00`))}, ${creneau.debut} – ${creneau.fin}`
  const majee = await changerStatutDemandeCoachingPrive(demande.id, {
    statut: 'en-etude',
    auteur: `${utilisateur.prenom} ${utilisateur.nom}`,
    commentaire: `Autre créneau souhaité : ${libelle}.${message?.trim() ? ` ${message.trim()}` : ''}`,
  })
  return majee
})
