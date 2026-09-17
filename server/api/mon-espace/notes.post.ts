import {
  creerNote,
  listerDemandesCoachingPriveUtilisateur,
  listerInscriptionsUtilisateur,
  listerNotesUtilisateur,
  listerSessions,
} from '../../database/coaching'
import { exigerUtilisateur } from '../../utils/session'

/**
 * Notation du formateur après une séance — visible de l'admin et du formateur,
 * jamais publiée sur le site.
 *
 * La route acceptait jusqu'ici n'importe quel `formateurId` du corps, autant de
 * fois qu'on le voulait : tout compte connecté pouvait fabriquer la réputation
 * d'un formateur qu'il n'avait jamais vu. Les écrans, eux, connaissaient déjà
 * la règle — le bouton « Noter » n'apparaît qu'après une séance passée, et
 * `mon-espace/coaching-prive/index.get.ts:39` masque celui d'une séance déjà
 * notée. Ce sont ces deux règles qui descendent ici, où elles comptent.
 *
 * La table des notes ne porte pas la séance, seulement l'apprenant, le
 * formateur et l'origine. Le compte des occasions y supplée : autant de notes
 * que de séances réellement suivies, pas une de plus.
 */
const COMMENTAIRE_MAX = 1000

export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const body = await readBody<{
    formateurId?: unknown
    note?: unknown
    commentaire?: unknown
    origine?: unknown
  }>(event)

  const formateurId = typeof body.formateurId === 'string' ? body.formateurId.trim() : ''
  const origine = body.origine === 'collective' || body.origine === 'privee' ? body.origine : null
  const note = typeof body.note === 'number' ? body.note : NaN

  if (!formateurId || !origine) {
    throw createError({ statusCode: 422, statusMessage: 'Formateur et origine de la séance requis' })
  }
  if (!Number.isInteger(note) || note < 1 || note > 5) {
    throw createError({ statusCode: 422, statusMessage: 'Note comprise entre 1 et 5 requise' })
  }

  const commentaire = typeof body.commentaire === 'string' ? body.commentaire.trim() : ''
  if (commentaire.length > COMMENTAIRE_MAX) {
    throw createError({
      statusCode: 422,
      statusMessage: `Commentaire limité à ${COMMENTAIRE_MAX} caractères.`,
    })
  }

  const notes = await listerNotesUtilisateur(utilisateur.id)
  const deja = notes.filter((n) => n.formateurId === formateurId && n.origine === origine).length

  // Nombre de séances de ce formateur que l'apprenant a réellement suivies.
  let occasions: number
  if (origine === 'privee') {
    const demandes = await listerDemandesCoachingPriveUtilisateur(utilisateur.id)
    occasions = demandes.filter((d) => d.formateurId === formateurId && d.statut === 'realisee').length
  } else {
    const [inscriptions, sessions] = await Promise.all([
      listerInscriptionsUtilisateur(utilisateur.id),
      listerSessions(),
    ])
    const aujourdhui = new Date().toISOString().slice(0, 10)
    const passeesDuFormateur = new Set(
      sessions
        .filter((s) => s.formateurId === formateurId && s.statut !== 'annulee' && s.date <= aujourdhui)
        .map((s) => s.id),
    )
    occasions = inscriptions.filter((i) => passeesDuFormateur.has(i.sessionId)).length
  }

  if (!occasions) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Vous n’avez suivi aucune séance de ce formateur.',
    })
  }
  if (deja >= occasions) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Vous avez déjà noté cette séance.',
    })
  }

  return await creerNote({
    formateurId,
    utilisateurId: utilisateur.id,
    origine,
    note,
    commentaire: commentaire || undefined,
  })
})
