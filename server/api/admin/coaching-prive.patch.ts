import type { CreneauCoaching, StatutCoachingPrive } from '#shared/types'
import { enregistrerJournal } from '../../database/administration'
import { trouverFormateur } from '../../database/catalogue'
import { changerStatutDemandeCoachingPrive, trouverDemandeCoachingPrive } from '../../database/coaching'
import { trouverUtilisateur } from '../../database/comptes'
import { notifierCompte } from '../../utils/notifications'
import { exigerSection } from '../../utils/session'

type Action = 'confirmer' | 'marquer-payee' | 'planifier' | 'realisee' | 'refuser'

/** Statuts de départ admis pour chaque action, et statut d'arrivée. */
const TRANSITIONS: Record<Action, { depuis: StatutCoachingPrive[]; vers: StatutCoachingPrive }> = {
  confirmer: { depuis: ['en-attente'], vers: 'confirmee-attente-paiement' },
  'marquer-payee': { depuis: ['confirmee-attente-paiement'], vers: 'payee' },
  planifier: { depuis: ['payee'], vers: 'payee' },
  realisee: { depuis: ['payee'], vers: 'realisee' },
  refuser: { depuis: ['en-attente', 'confirmee-attente-paiement'], vers: 'refusee' },
}

const LIBELLES: Record<Action, string> = {
  confirmer: 'a confirmé la demande de coaching privé',
  'marquer-payee': 'a marqué payée la demande de coaching privé',
  planifier: 'a planifié la séance de coaching privé',
  realisee: 'a clos la séance de coaching privé',
  refuser: 'a refusé la demande de coaching privé',
}

function libelleCreneau(c: CreneauCoaching): string {
  const date = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(`${c.date}T00:00:00`),
  )
  return `${date}, ${c.debut} – ${c.fin}`
}

/**
 * Traitement d'une demande par l'équipe (planche C, écran 05) : confirmation
 * et lien de paiement, encaissement, planification avec le lien de session,
 * clôture, refus motivé. Chaque action est journalisée et l'apprenant est
 * prévenu ; le formateur l'est à la planification.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'coaching-prive')
  const body = await readBody<{
    id: string
    action: Action
    creneau?: CreneauCoaching | string
    lienSession?: string
    motif?: string
    commentaire?: string
  }>(event)

  const transition = TRANSITIONS[body.action]
  if (!transition) throw createError({ statusCode: 422, statusMessage: 'Action inconnue' })

  const demande = await trouverDemandeCoachingPrive(body.id ?? '')
  if (!demande) throw createError({ statusCode: 404, statusMessage: 'Demande introuvable' })
  if (!transition.depuis.includes(demande.statut)) {
    throw createError({
      statusCode: 409,
      statusMessage: `Action impossible sur une demande « ${demande.statut} »`,
    })
  }

  const creneau =
    typeof body.creneau === 'string'
      ? body.creneau.trim()
      : body.creneau?.date
        ? libelleCreneau(body.creneau)
        : ''
  const lienSession = (body.lienSession ?? '').trim()
  const motif = (body.motif ?? '').trim()

  if (body.action === 'planifier' && (!creneau || !lienSession)) {
    throw createError({ statusCode: 422, statusMessage: 'Créneau et lien de session obligatoires' })
  }
  if (body.action === 'refuser' && !motif) {
    throw createError({ statusCode: 422, statusMessage: 'Le motif du refus est obligatoire' })
  }

  const auteur = `${admin.prenom} ${admin.nom}`
  const commentaire =
    body.action === 'refuser'
      ? `Motif : ${motif}`
      : [creneau && `Créneau retenu : ${creneau}.`, body.commentaire?.trim()].filter(Boolean).join(' ')

  const majee = await changerStatutDemandeCoachingPrive(demande.id, {
    statut: transition.vers,
    auteur,
    commentaire,
    creneau: creneau || undefined,
    lienSession: body.action === 'planifier' ? lienSession : undefined,
    motifRefus: body.action === 'refuser' ? motif : undefined,
  })

  await enregistrerJournal(auteur, LIBELLES[body.action], `${demande.id} — ${demande.apprenant}`)

  const [apprenant, formateur] = await Promise.all([
    trouverUtilisateur(demande.utilisateurId),
    trouverFormateur(demande.formateurId),
  ])
  const variables = {
    prenom: apprenant?.prenom ?? '',
    statut: transition.vers,
    creneau: majee.creneau ?? '',
    lien: majee.lienSession ?? '',
    motif,
    formateur: formateur?.nom ?? '',
  }
  if (apprenant) await notifierCompte(apprenant, 'coaching-prive-statut', variables)

  return majee
})
