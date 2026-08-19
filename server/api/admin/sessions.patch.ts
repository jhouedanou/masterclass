import { enregistrerJournal, sessionsCoaching, thematiques } from '../../data/db'
import { exigerAdmin } from '../../utils/session'

/** Annulation ou report : les inscrits sont notifiés par e-mail et WhatsApp. */
export default defineEventHandler(async (event) => {
  const admin = exigerAdmin(event)
  const { id, action, motif, date, heure } = await readBody<{
    id: string
    action: 'annuler' | 'reporter'
    motif?: string
    date?: string
    heure?: string
  }>(event)

  const session = sessionsCoaching.find((s) => s.id === id)
  if (!session) throw createError({ statusCode: 404, statusMessage: 'Session introuvable' })

  const thematique = thematiques.find((t) => t.id === session.thematiqueId)?.nom ?? ''

  if (action === 'annuler') {
    session.statut = 'annulee'
    enregistrerJournal(
      `${admin.prenom} ${admin.nom}`,
      'a annulé la session',
      `${thematique} du ${session.date}${motif ? ` (motif : ${motif})` : ''}`,
    )
  } else {
    if (date) session.date = date
    if (heure) session.heure = heure
    enregistrerJournal(
      `${admin.prenom} ${admin.nom}`,
      'a reporté la session',
      `${thematique} au ${session.date} ${session.heure}`,
    )
  }

  return { session, notifies: session.inscrits, canaux: ['email', 'whatsapp'] }
})
