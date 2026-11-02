import { trouverFormateur, listerThematiques } from '../../database/catalogue'
import {
  liensZoomSession,
  listerInscriptionsUtilisateur,
  motDePasseZoomDemande,
  trouverDemandeCoachingPrive,
  trouverSession,
} from '../../database/coaching'
import { estInscritLive, liensZoomLive, trouverLiveSession } from '../../database/live'
import { exigerUtilisateur } from '../../utils/session'
import { accesHote, configZoom, debutSession, salleOuverte, signatureSdk } from '../../utils/zoom'

/**
 * Autorisation d'entrée dans une salle (planche B, écran 11). Avant de signer :
 * connecté · inscrit à la session (ou formateur de la session, ou admin) ·
 * salle ouverte (de H-15 min à la fin + 30 min) · rôle identifié. Le jeton du
 * Meeting SDK est signé côté serveur, les clés Zoom ne sont jamais exposées.
 *
 * Trois sortes de salles : coaching collectif (`sessionId`), Live Session
 * (`sessionId` en `live-…`) et coaching privé (`demandeId`). L'hôte reçoit en
 * plus le ZAK du compte Zoom, sans lequel il ne peut pas démarrer la réunion.
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
  /** Formateur de la séance : seul destinataire possible du ZAK. */
  let formateurHote = false
  let sujet = ''
  let debut: Date
  let dureeMinutes = 120
  let ouvertureMinutes = 15

  if (sessionId?.startsWith('live-')) {
    const live = await trouverLiveSession(sessionId)
    if (!live || live.statut === 'annulee' || live.statut === 'brouillon') {
      throw createError({ statusCode: 404, statusMessage: 'Live Session introuvable' })
    }
    const hote = utilisateur.role === 'formateur' && utilisateur.formateurId === live.formateurId
    if (!hote && !admin && !(await estInscritLive(live.id, utilisateur.id))) {
      throw createError({ statusCode: 403, statusMessage: 'Inscrivez-vous à cette Live Session pour la rejoindre' })
    }
    role = hote || admin ? 1 : 0
    formateurHote = hote
    const liens = await liensZoomLive(live.id)
    numeroReunion = liens.reunionId
    motDePasse = liens.motDePasse
    lienSecours = role === 1 ? liens.lienHote : liens.lienParticipation
    sujet = live.titre
    debut = debutSession(live.date, live.heure)
    dureeMinutes = live.dureeMinutes
    ouvertureMinutes = 15
  } else if (sessionId) {
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
    formateurHote = hote
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
    formateurHote = hote
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
  // Le ZAK est celui du compte Zoom de Big Five, propriétaire de toutes les
  // réunions : il permettrait d'en démarrer d'autres pendant sa durée de vie.
  // Il ne part donc qu'au formateur de la séance (pas à l'administration),
  // et seulement salle ouverte. Le lien de démarrage relu suit la même règle
  // (il porte lui aussi un jeton d'hôte).
  let zak: string | null = null
  if (formateurHote && ouverte && numeroReunion) {
    const hote = await accesHote(numeroReunion)
    zak = hote.zak
    lienSecours = hote.lienHote ?? lienSecours
  }
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
    zak,
    ouverture: ouverture.toISOString(),
  }
})
