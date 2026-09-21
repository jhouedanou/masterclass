import { DUREE_SESSION_MINUTES } from '#shared/utils/coaching'
import { enregistrerJournal } from '../../database/administration'
import { listerThematiques, trouverFormateur } from '../../database/catalogue'
import { creerSession } from '../../database/coaching'
import { exigerSection } from '../../utils/session'
import { creerReunion, debutSession } from '../../utils/zoom'

/**
 * Planification d'une session. La réunion Zoom est créée à la validation —
 * intégration à brancher ; le lien n'est jamais affiché en clair aux apprenants.
 *
 * L'unicité « une session par thématique et par date » est portée par un index
 * partiel : deux planifications simultanées ne peuvent plus se doubler.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'calendrier-sessions')
  const body = await readBody<{
    thematiqueId: string
    formateurId: string
    date: string
    heure: string
    dureeMinutes?: number
    places?: number
    titre?: string
    ouvertureSalleMinutes?: number
    enregistrement?: boolean
  }>(event)

  const [thematiques, formateur] = await Promise.all([
    listerThematiques(),
    trouverFormateur(body.formateurId),
  ])
  const thematique = thematiques.find((t) => t.id === body.thematiqueId)

  if (!thematique || !formateur) {
    throw createError({ statusCode: 404, statusMessage: 'Thématique ou formateur introuvable' })
  }

  // La réunion Zoom est créée à la validation (planche C, écran 03) ; le lien
  // n'est jamais affiché en clair aux apprenants.
  const zoom = await creerReunion({
    sujet: body.titre?.trim() || `${thematique.nom} — coaching collectif`,
    debutIso: debutSession(body.date, body.heure).toISOString(),
    dureeMinutes: body.dureeMinutes ?? DUREE_SESSION_MINUTES,
    enregistrement: body.enregistrement === true,
  })
  const session = await creerSession({
    thematiqueId: body.thematiqueId,
    programme: thematique.programme,
    formateurId: body.formateurId,
    date: body.date,
    heure: body.heure,
    dureeMinutes: body.dureeMinutes,
    places: body.places,
    titre: body.titre?.trim() || undefined,
    ouvertureSalleMinutes: body.ouvertureSalleMinutes,
    enregistrement: body.enregistrement === true,
    zoom,
  })

  await enregistrerJournal(
    `${admin.prenom} ${admin.nom}`,
    'a planifié une session',
    `${thematique.nom} — ${formateur.nom}, ${body.date} ${body.heure}`,
  )
  return session
})
