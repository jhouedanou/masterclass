import { enregistrerJournal } from '../../database/administration'
import { listerThematiques } from '../../database/catalogue'
import { annulerSession, reporterSession, trouverSession } from '../../database/coaching'
import { exigerAdmin } from '../../utils/session'

/** Annulation ou report : les inscrits sont notifiés par e-mail et WhatsApp. */
export default defineEventHandler(async (event) => {
  const admin = await exigerAdmin(event)
  const { id, action, motif, date, heure } = await readBody<{
    id: string
    action: 'annuler' | 'reporter'
    motif?: string
    date?: string
    heure?: string
  }>(event)

  const existante = await trouverSession(id)
  if (!existante) throw createError({ statusCode: 404, statusMessage: 'Session introuvable' })

  const thematiques = await listerThematiques()
  const thematique = thematiques.find((t) => t.id === existante.thematiqueId)?.nom ?? ''
  const auteur = `${admin.prenom} ${admin.nom}`

  let session
  if (action === 'annuler') {
    session = await annulerSession(id)
    await enregistrerJournal(
      auteur,
      'a annulé la session',
      `${thematique} du ${session.date}${motif ? ` (motif : ${motif})` : ''}`,
    )
  } else {
    session = await reporterSession(id, { date, heure })
    await enregistrerJournal(
      auteur,
      'a reporté la session',
      `${thematique} au ${session.date} ${session.heure}`,
    )
  }

  return { session, notifies: session.inscrits, canaux: ['email', 'whatsapp'] }
})
