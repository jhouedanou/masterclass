import { listerThematiques, trouverFormateur, trouverModule } from '../../database/catalogue'
import {
  liensZoomSession,
  listerInscriptionsUtilisateur,
  motDePasseZoomDemande,
  trouverDemandeCoachingPrive,
  trouverSession,
} from '../../database/coaching'
import { liensZoomLive, trouverInscriptionLive, trouverSessionLive } from '../../database/live'
import { DELAIS_LIVE } from '#shared/utils/live'
import { liveVisiblePour, visibiliteLive } from '../../utils/live'
import { exigerUtilisateur } from '../../utils/session'
import { accesHote, configZoom, debutSession, salleOuverte, signatureSdk } from '../../utils/zoom'

/**
 * Autorisation d'entrée dans une salle (planche B, écran 11). Avant de signer :
 * connecté · inscrit à la session (ou formateur de la session, ou admin) ·
 * salle ouverte (de H-15 min à la fin + 30 min) · rôle identifié. Le jeton du
 * Meeting SDK est signé côté serveur, les clés Zoom ne sont jamais exposées.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const { sessionId, demandeId, sessionLiveId } = await readBody<{
    sessionId?: string
    demandeId?: string
    /** Live Session (CDC v1.3, option B : salle intégrée). */
    sessionLiveId?: string
  }>(event)
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

  if (sessionLiveId) {
    // Live Session : inscrit confirmé (rôle 0), formateur de la session ou
    // admin modérateur (rôle 1). La salle ouvre 15 min avant pour les
    // inscrits, 30 min avant pour l'hôte (§4.4), et ferme 30 min après la fin.
    if (!liveVisiblePour(await visibiliteLive(), utilisateur)) {
      throw createError({ statusCode: 404, statusMessage: 'Live Session introuvable' })
    }
    const live = await trouverSessionLive(sessionLiveId)
    if (!live || !['publiee', 'en-cours'].includes(live.statut)) {
      throw createError({ statusCode: 404, statusMessage: 'Cette Live Session n’est pas ouverte' })
    }
    const hote = utilisateur.role === 'formateur' && utilisateur.formateurId === live.formateurId
    if (!hote && !admin) {
      const inscription = await trouverInscriptionLive(live.id, utilisateur.id)
      if (inscription?.statut !== 'confirmee') {
        throw createError({ statusCode: 403, statusMessage: 'Cette salle est réservée aux inscrits de la Live Session' })
      }
    }
    role = hote || admin ? 1 : 0
    formateurHote = hote
    const liens = await liensZoomLive(live.id)
    numeroReunion = liens.reunionId
    motDePasse = liens.motDePasse
    lienSecours = role === 1 ? liens.lienHote : null
    const module = await trouverModule(live.moduleId)
    sujet = `Live Session — ${module?.titre ?? ''}`
    debut = new Date(live.debut)
    dureeMinutes = live.dureeMinutes
    ouvertureMinutes = role === 1 ? DELAIS_LIVE.animerMinutes : DELAIS_LIVE.salleApprenantMinutes
    const salle = salleOuverte(debut, dureeMinutes, ouvertureMinutes)
    if (!salle.ouverte && role === 1) {
      throw createError({
        statusCode: 425,
        statusMessage: `La salle ouvre ${ouvertureMinutes} minutes avant le début de la session.`,
        data: { ouverture: salle.ouverture.toISOString() },
      })
    }
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

  // Démarrage par le formateur : les réunions appartiennent au compte Zoom de
  // Big Five et l'hôte entre le premier ; sans le ZAK de ce compte, le
  // formateur attendait l'hôte comme ses apprenants. Ce ZAK permettrait de
  // démarrer d'autres réunions du compte pendant sa durée de vie : il ne part
  // qu'au formateur de la séance (pas à l'administration), dans la fenêtre de
  // la réunion telle que Zoom la connaît, et chaque remise est journalisée.
  // Le lien de démarrage relu suit la même règle (il porte lui aussi un jeton).
  // Pour s'en passer : un utilisateur Zoom par formateur (licences).
  let zak: string | null = null
  if (formateurHote && numeroReunion) {
    // `accesHote` vérifie lui-même la fenêtre, sur l'heure de la réunion chez Zoom.
    const hote = await accesHote(numeroReunion)
    zak = hote.zak
    lienSecours = hote.lienHote ?? lienSecours
    if (zak) console.info('[zoom] ZAK remis', { formateur: utilisateur.formateurId, reunion: numeroReunion })
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
