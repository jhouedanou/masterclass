import { enregistrerJournal } from '../../database/administration'
import { listerThematiques } from '../../database/catalogue'
import {
  annulerSession,
  listerInscritsSession,
  majSession,
  reporterSession,
  trouverSession,
} from '../../database/coaching'
import { notifierCompte } from '../../utils/notifications'
import { exigerSection } from '../../utils/session'
import { debutSession, modifierReunion, supprimerReunion } from '../../utils/zoom'

/**
 * Annulation, report ou modification.
 *
 * Les deux premières touchent l'apprenant : ses inscrits sont notifiés par
 * e-mail et WhatsApp. La troisième ne change que des réglages internes — durée,
 * capacité, ouverture de la salle — et ne dérange personne.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'calendrier-sessions')
  const body = await readBody<{
    id: string
    action: 'annuler' | 'reporter' | 'modifier'
    motif?: string
    date?: string
    heure?: string
    formateurId?: string
    titre?: string
    dureeMinutes?: number
    places?: number
    ouvertureSalleMinutes?: number
    enregistrement?: boolean
  }>(event)
  const { id, action, motif, date, heure } = body

  const existante = await trouverSession(id)
  if (!existante) throw createError({ statusCode: 404, statusMessage: 'Session introuvable' })

  const thematiques = await listerThematiques()
  const thematique = thematiques.find((t) => t.id === existante.thematiqueId)?.nom ?? ''
  const auteur = `${admin.prenom} ${admin.nom}`

  // Une modification de réglages ne prévient personne : rien de ce qu'elle
  // touche n'est visible de l'apprenant avant la séance.
  if (action === 'modifier') {
    const session = await majSession(id, {
      formateurId: body.formateurId,
      titre: body.titre,
      dureeMinutes: body.dureeMinutes,
      places: body.places,
      ouvertureSalleMinutes: body.ouvertureSalleMinutes,
      enregistrement: body.enregistrement,
    })
    if (existante.zoomReunionId) {
      await modifierReunion(existante.zoomReunionId, {
        sujet: session.titre || `${thematique} — coaching collectif`,
        dureeMinutes: session.dureeMinutes,
      })
    }
    await enregistrerJournal(auteur, 'a modifié la session', `${thematique} du ${session.date}`)
    return { session, notifies: 0, canaux: [] }
  }

  let session
  if (action === 'annuler') {
    session = await annulerSession(id)
    await supprimerReunion(existante.zoomReunionId ?? '')
    await enregistrerJournal(
      auteur,
      'a annulé la session',
      `${thematique} du ${session.date}${motif ? ` (motif : ${motif})` : ''}`,
    )
  } else {
    session = await reporterSession(id, { date, heure })
    await modifierReunion(existante.zoomReunionId ?? '', {
      debutIso: debutSession(session.date, session.heure).toISOString(),
    })
    await enregistrerJournal(
      auteur,
      'a reporté la session',
      `${thematique} au ${session.date} ${session.heure}`,
    )
  }

  // Les inscrits sont prévenus sur les deux canaux (planche C, écran 03).
  const inscrits = await listerInscritsSession(id)
  const modele = action === 'annuler' ? 'session-annulee' : 'session-reportee'
  await Promise.all(
    inscrits.map((inscrit) =>
      notifierCompte(inscrit, modele, {
        prenom: inscrit.prenom,
        thematique,
        date: session.date,
        heure: session.heure,
        motif: motif ?? '',
      }),
    ),
  )

  return { session, notifies: inscrits.length, canaux: ['email', 'whatsapp'] }
})
