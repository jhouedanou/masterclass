import { trouverFormateur, listerThematiques } from '../../database/catalogue'
import {
  liensZoomSession,
  listerInscriptionsUtilisateur,
  motDePasseZoomDemande,
  trouverDemandeCoachingPrive,
  trouverSession,
} from '../../database/coaching'
import { exigerUtilisateur } from '../../utils/session'
import { configZoom, debutSession, salleOuverte, signatureSdk } from '../../utils/zoom'

/**
 * Autorisation d'entrée dans une salle (planche B, écran 11). Avant de signer :
 * connecté · inscrit à la session (ou formateur de la session, ou admin) ·
 * salle ouverte (de H-15 min à la fin + 30 min) · rôle identifié. Le jeton du
 * Meeting SDK est signé côté serveur, les clés Zoom ne sont jamais exposées.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const { sessionId, demandeId } = await readBody<{ sessionId?: string; demandeId?: string }>(event)
  const admin = utilisateur.role === 'admin-contenu' || utilisateur.role === 'admin-superieur'
  const { mode } = configZoom()

  let numeroReunion: string | null = null
  let motDePasse: string | null = null
  let lienSecours: string | null = null
  let role: 0 | 1 = 0
  let sujet = ''
  let debut: Date
  let dureeMinutes = 120
  let ouvertureMinutes = 15

  if (sessionId) {
    const session = await trouverSession(sessionId)
    if (!session || session.statut === 'annulee') throw createError({ statusCode: 404, statusMessage: 'Session introuvable' })
    const hote = utilisateur.role === 'formateur' && utilisateur.formateurId === session.formateurId
    if (!hote && !admin) {
      const inscriptions = await listerInscriptionsUtilisateur(utilisateur.id)
      if (!inscriptions.some((i) => i.sessionId === session.id)) {
        throw createError({ statusCode: 403, statusMessage: 'Vous devez avoir réservé votre place pour rejoindre cette session' })
      }
    }
    role = hote || admin ? 1 : 0
    const liens = await liensZoomSession(session.id)
    numeroReunion = liens.reunionId
    motDePasse = liens.motDePasse
    lienSecours = role === 1 ? liens.lienHote : liens.lienParticipation
    const thematiques = await listerThematiques()
    sujet = session.titre ?? thematiques.find((t) => t.id === session.thematiqueId)?.nom ?? 'Session de coaching'
    debut = debutSession(session.date, session.heure)
    dureeMinutes = session.dureeMinutes
    ouvertureMinutes = session.ouvertureSalleMinutes
  } else if (demandeId) {
    const demande = await trouverDemandeCoachingPrive(demandeId)
    if (!demande) throw createError({ statusCode: 404, statusMessage: 'Séance introuvable' })
    const hote = utilisateur.role === 'formateur' && utilisateur.formateurId === demande.formateurId
    if (!hote && !admin && demande.utilisateurId !== utilisateur.id) {
      throw createError({ statusCode: 403, statusMessage: 'Cette séance ne vous concerne pas' })
    }
    if (demande.statut !== 'payee') {
      throw createError({ statusCode: 409, statusMessage: 'La séance n’est pas encore confirmée' })
    }
    role = hote || admin ? 1 : 0
    numeroReunion = demande.zoomReunionId ?? null
    motDePasse = await motDePasseZoomDemande(demande.id)
    lienSecours = demande.lienSession ?? null
    const formateur = await trouverFormateur(demande.formateurId)
    sujet = `Coaching privé — ${formateur?.nom ?? ''}`
    // Le créneau retenu est un libellé ; sans instant précis, la salle reste ouverte le jour même.
    debut = new Date()
    dureeMinutes = demande.heures * 60
    ouvertureMinutes = 15
  } else {
    throw createError({ statusCode: 422, statusMessage: 'Session ou séance à préciser' })
  }

  const { ouverte, ouverture } = salleOuverte(debut, dureeMinutes, ouvertureMinutes)
  if (!ouverte && role === 0) {
    throw createError({
      statusCode: 425,
      statusMessage: `La salle ouvre ${ouvertureMinutes} minutes avant le début de la session.`,
      data: { ouverture: ouverture.toISOString() },
    })
  }
  if (mode === 'live' && !numeroReunion) {
    throw createError({ statusCode: 409, statusMessage: 'Aucune réunion Zoom n’est rattachée à cette session.' })
  }

  const reunion = numeroReunion ?? 'simulation'
  const { signature, sdkKey } = signatureSdk(reunion, role)
  return {
    mode,
    signature,
    sdkKey,
    numeroReunion: reunion,
    motDePasse: motDePasse ?? '',
    nomAffiche: `${utilisateur.prenom} ${utilisateur.nom}`,
    email: utilisateur.email,
    role,
    sujet,
    lienSecours,
    ouverture: ouverture.toISOString(),
  }
})
