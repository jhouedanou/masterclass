import type { CreneauCoaching, StatutCoachingPrive } from '#shared/types'
import { enregistrerJournal } from '../../database/administration'
import { trouverFormateur } from '../../database/catalogue'
import {
  changerStatutDemandeCoachingPrive,
  majMontantDemande,
  majZoomDemande,
  trouverDemandeCoachingPrive,
} from '../../database/coaching'
import { creerReunion } from '../../utils/zoom'
import { supabase } from '../../database/client'

async function supabaseHeures(id: string, heures: number) {
  const { error } = await supabase().from('demandes_coaching_prive').update({ heures }).eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: 'Mise à jour des heures impossible' })
}
import { trouverUtilisateur } from '../../database/comptes'
import { notifierCompte } from '../../utils/notifications'
import { exigerSection } from '../../utils/session'

type Action = 'etudier' | 'confirmer' | 'marquer-payee' | 'planifier' | 'realisee' | 'refuser'

/** Statuts de départ admis pour chaque action, et statut d'arrivée (planche B, 10 : les six statuts). */
const TRANSITIONS: Record<Action, { depuis: StatutCoachingPrive[]; vers: StatutCoachingPrive }> = {
  etudier: { depuis: ['en-attente'], vers: 'en-etude' },
  confirmer: { depuis: ['en-attente', 'en-etude'], vers: 'confirmee-attente-paiement' },
  'marquer-payee': { depuis: ['confirmee-attente-paiement'], vers: 'payee' },
  planifier: { depuis: ['payee'], vers: 'payee' },
  realisee: { depuis: ['payee'], vers: 'realisee' },
  refuser: { depuis: ['en-attente', 'en-etude', 'confirmee-attente-paiement'], vers: 'refusee' },
}

const LIBELLES: Record<Action, string> = {
  etudier: 'a mis en étude la demande de coaching privé',
  confirmer: 'a proposé un créneau pour la demande de coaching privé',
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
    /** Heures retenues par l'équipe (1 h / 2 h / 3 h), à la proposition du créneau. */
    heures?: number
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

  if (body.action === 'confirmer' && !creneau) {
    throw createError({ statusCode: 422, statusMessage: 'Le créneau proposé est obligatoire' })
  }
  if (body.action === 'planifier' && !creneau) {
    throw createError({ statusCode: 422, statusMessage: 'Le créneau de la séance est obligatoire' })
  }
  if (body.action === 'refuser' && !motif) {
    throw createError({ statusCode: 422, statusMessage: 'Le motif du refus est obligatoire' })
  }

  const auteur = `${admin.prenom} ${admin.nom}`

  // Proposition : heures et montant (heures × tarif) accompagnent le créneau.
  let montant: number | undefined
  if (body.action === 'confirmer') {
    const heures = Number(body.heures ?? demande.heures)
    if (![1, 2, 3].includes(heures)) throw createError({ statusCode: 422, statusMessage: '1, 2 ou 3 heures' })
    const formateurTarif = (await trouverFormateur(demande.formateurId))?.coachingPriveFcfaHeure ?? 50_000
    montant = heures * formateurTarif
    if (heures !== demande.heures) {
      await supabaseHeures(demande.id, heures)
    }
    await majMontantDemande(demande.id, montant)
  }

  // Planification : la réunion Zoom est créée ici, le lien n'est jamais
  // saisi à la main. Un lien fourni reste accepté en secours.
  let lienGenere = lienSession
  if (body.action === 'planifier') {
    const formateur = await trouverFormateur(demande.formateurId)
    const reunion = await creerReunion({
      sujet: `Coaching privé — ${formateur?.nom ?? ''} · ${demande.apprenant}`,
      debutIso: new Date().toISOString(),
      dureeMinutes: demande.heures * 60,
    })
    lienGenere = lienSession || reunion.lienParticipation
    await majZoomDemande(demande.id, { reunionId: reunion.id, motDePasse: reunion.motDePasse, lienParticipation: lienGenere })
  }

  const commentaire =
    body.action === 'refuser'
      ? `Motif : ${motif}`
      : [creneau && `Créneau retenu : ${creneau}.`, body.commentaire?.trim()].filter(Boolean).join(' ')

  const majee = await changerStatutDemandeCoachingPrive(demande.id, {
    statut: transition.vers,
    auteur,
    commentaire,
    creneau: creneau || undefined,
    lienSession: body.action === 'planifier' ? lienGenere : undefined,
    motifRefus: body.action === 'refuser' ? motif : undefined,
  })

  await enregistrerJournal(auteur, LIBELLES[body.action], `${demande.id} — ${demande.apprenant}`, {
    type: 'coaching-prive',
    objet: 'demande',
    notification: 'Notification envoyée ✓',
  })

  const [apprenant, formateur] = await Promise.all([
    trouverUtilisateur(demande.utilisateurId),
    trouverFormateur(demande.formateurId),
  ])
  const variables = {
    prenom: apprenant?.prenom ?? '',
    statut: transition.vers,
    montant: montant ? String(montant) : '',
    heures: String(demande.heures),
    creneau: majee.creneau ?? '',
    lien: majee.lienSession ?? '',
    motif,
    formateur: formateur?.nom ?? '',
  }
  if (apprenant) await notifierCompte(apprenant, 'coaching-prive-statut', variables)

  return majee
})
