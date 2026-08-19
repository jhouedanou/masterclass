import { enregistrerJournal, formateurs, sessionsCoaching, thematiques } from '../../data/db'
import { exigerAdmin } from '../../utils/session'

/**
 * Planification d'une session. La réunion Zoom est créée à la validation —
 * intégration à brancher ; le lien n'est jamais affiché en clair aux apprenants.
 */
export default defineEventHandler(async (event) => {
  const admin = exigerAdmin(event)
  const body = await readBody<{
    thematiqueId: string
    formateurId: string
    date: string
    heure: string
    dureeMinutes?: number
    places?: number
  }>(event)

  const thematique = thematiques.find((t) => t.id === body.thematiqueId)
  const formateur = formateurs.find((f) => f.id === body.formateurId)
  if (!thematique || !formateur) {
    throw createError({ statusCode: 404, statusMessage: 'Thématique ou formateur introuvable' })
  }

  // Une seule session par couple thématique–formateur et par date.
  if (
    sessionsCoaching.some(
      (s) => s.thematiqueId === body.thematiqueId && s.date === body.date && s.statut !== 'annulee',
    )
  ) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Une session existe déjà pour cette thématique à cette date',
    })
  }

  const session = {
    id: `ses-${String(sessionsCoaching.length + 1).padStart(3, '0')}`,
    thematiqueId: body.thematiqueId,
    programme: thematique.programme,
    formateurId: body.formateurId,
    date: body.date,
    heure: body.heure,
    dureeMinutes: body.dureeMinutes ?? 120,
    places: body.places ?? 25,
    inscrits: 0,
    statut: 'planifiee' as const,
  }
  sessionsCoaching.push(session)

  enregistrerJournal(
    `${admin.prenom} ${admin.nom}`,
    'a planifié une session',
    `${thematique.nom} — ${formateur.nom}, ${body.date} ${body.heure}`,
  )
  return session
})
