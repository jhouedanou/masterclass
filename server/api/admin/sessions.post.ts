import { enregistrerJournal } from '../../database/administration'
import { listerThematiques, trouverFormateur } from '../../database/catalogue'
import { creerSession } from '../../database/coaching'
import { exigerAdmin } from '../../utils/session'

/**
 * Planification d'une session. La réunion Zoom est créée à la validation —
 * intégration à brancher ; le lien n'est jamais affiché en clair aux apprenants.
 *
 * L'unicité « une session par thématique et par date » est portée par un index
 * partiel : deux planifications simultanées ne peuvent plus se doubler.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerAdmin(event)
  const body = await readBody<{
    thematiqueId: string
    formateurId: string
    date: string
    heure: string
    dureeMinutes?: number
    places?: number
  }>(event)

  const [thematiques, formateur] = await Promise.all([
    listerThematiques(),
    trouverFormateur(body.formateurId),
  ])
  const thematique = thematiques.find((t) => t.id === body.thematiqueId)

  if (!thematique || !formateur) {
    throw createError({ statusCode: 404, statusMessage: 'Thématique ou formateur introuvable' })
  }

  const session = await creerSession({
    thematiqueId: body.thematiqueId,
    programme: thematique.programme,
    formateurId: body.formateurId,
    date: body.date,
    heure: body.heure,
    dureeMinutes: body.dureeMinutes,
    places: body.places,
  })

  await enregistrerJournal(
    `${admin.prenom} ${admin.nom}`,
    'a planifié une session',
    `${thematique.nom} — ${formateur.nom}, ${body.date} ${body.heure}`,
  )
  return session
})
