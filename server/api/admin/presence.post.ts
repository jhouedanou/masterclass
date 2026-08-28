import { enregistrerJournal } from '../../database/administration'
import { listerThematiques } from '../../database/catalogue'
import { releverPresence, trouverSession } from '../../database/coaching'
import { exigerSection } from '../../utils/session'

/**
 * Relevé de présence après une séance de coaching collectif.
 *
 * C'est la seule source du taux de présence affiché aux formateurs et à
 * l'administration : tant qu'il n'est pas saisi, ces écrans affichent « — »
 * plutôt qu'une estimation.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'calendrier-sessions')
  const { id, presents } = await readBody<{ id: string; presents: number | null }>(event)

  const session = await trouverSession(id)
  if (!session) throw createError({ statusCode: 404, statusMessage: 'Session introuvable' })

  if (presents !== null && (presents < 0 || presents > session.inscrits)) {
    throw createError({
      statusCode: 422,
      statusMessage: `Le nombre de présents doit être compris entre 0 et ${session.inscrits} inscrits.`,
    })
  }

  const misAJour = await releverPresence(id, presents)

  const thematiques = await listerThematiques()
  const thematique = thematiques.find((t) => t.id === session.thematiqueId)?.nom ?? ''
  await enregistrerJournal(
    `${admin.prenom} ${admin.nom}`,
    presents === null ? 'a effacé le relevé de présence' : 'a relevé la présence',
    presents === null
      ? `${thematique} du ${session.date}`
      : `${thematique} du ${session.date} — ${presents}/${session.inscrits} présents`,
  )

  return misAJour
})
