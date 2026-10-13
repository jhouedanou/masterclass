import { DUREE_SESSION_MINUTES, PLACES_SESSION } from '#shared/utils/coaching'
import { enregistrerJournal } from '../../database/administration'
import { listerThematiques, trouverFormateur } from '../../database/catalogue'
import { creerSession } from '../../database/coaching'
import { exigerSection } from '../../utils/session'
import { creerReunion, debutSession } from '../../utils/zoom'

/**
 * Planification d'une session. La réunion Zoom est créée à la validation —
 * intégration à brancher ; le lien n'est jamais affiché en clair aux apprenants.
 *
 * L'unicité « une session par couple thématique–formateur et par mois » est
 * portée par un index partiel : deux planifications simultanées ne peuvent pas
 * se doubler.
 *
 * Le format est celui du modèle économique — deux heures, vingt-cinq places —
 * et n'est pas négociable depuis l'écran : le corps de la requête n'en décide
 * pas.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'calendrier-sessions')
  const body = await readBody<{
    thematiqueId: string
    formateurId: string
    date: string
    heure: string
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
    dureeMinutes: DUREE_SESSION_MINUTES,
    enregistrement: body.enregistrement === true,
  })
  const session = await creerSession({
    thematiqueId: body.thematiqueId,
    programme: thematique.programme,
    formateurId: body.formateurId,
    date: body.date,
    heure: body.heure,
    dureeMinutes: DUREE_SESSION_MINUTES,
    places: PLACES_SESSION,
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
