import { JOURS_SEMAINE, type CreneauCoaching } from '#shared/types'
import { trouverFormateur } from '../../../database/catalogue'
import { creerDemandeCoachingPrive } from '../../../database/coaching'
import { trouverAcces } from '../../../database/comptes'
import { exigerUtilisateur } from '../../../utils/session'

/** 1 h, 2 h ou 3 h (planche B, écran 04) ; au-delà, l'équipe découpe. */
const HEURES_MAX = 3
/** « 3 minimum — jour de la semaine + tranche horaire ». */
const CRENEAUX_MIN = 3
const CRENEAUX_MAX = 14
const LONGUEUR_MIN = 20

function creneauValide(c: CreneauCoaching): boolean {
  if (!/^\d{2}:\d{2}$/.test(c.debut ?? '') || !/^\d{2}:\d{2}$/.test(c.fin ?? '')) return false
  if (c.fin <= c.debut) return false
  if (c.jour) return (JOURS_SEMAINE as readonly string[]).includes(c.jour)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.date ?? '')) return false
  return (c.date ?? '') >= new Date().toISOString().slice(0, 10)
}

/**
 * Nouvelle demande de coaching privé (planche B, écran 06). Les questions
 * sont obligatoires, le formateur doit avoir l'accès activé et l'apprenant
 * doit posséder le module concerné.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const body = await readBody<{
    moduleId?: string
    formateurId?: string
    /** « Préoccupations / sujets à traiter » (planche B, écran 04). */
    sujets?: string
    objectif?: string
    difficulte?: string
    disponibilites?: string
    creneaux?: CreneauCoaching[]
    heures?: number
  }>(event)

  const sujets = (body.sujets ?? '').trim()
  const objectif = (body.objectif ?? '').trim()
  const difficulte = (body.difficulte ?? '').trim()
  const heures = Number(body.heures)
  const creneaux = Array.isArray(body.creneaux) ? body.creneaux : []

  if (!body.moduleId || !body.formateurId) {
    throw createError({ statusCode: 422, statusMessage: 'Module et formateur sont obligatoires' })
  }
  if (sujets.length < LONGUEUR_MIN && (objectif.length < LONGUEUR_MIN || difficulte.length < LONGUEUR_MIN)) {
    throw createError({
      statusCode: 422,
      statusMessage: `Décrivez vos préoccupations et sujets à traiter (${LONGUEUR_MIN} caractères minimum)`,
    })
  }
  if (!Number.isInteger(heures) || heures < 1 || heures > HEURES_MAX) {
    throw createError({ statusCode: 422, statusMessage: `Entre 1 et ${HEURES_MAX} heures` })
  }
  if (creneaux.length < CRENEAUX_MIN || creneaux.length > CRENEAUX_MAX || !creneaux.every(creneauValide)) {
    throw createError({
      statusCode: 422,
      statusMessage: `Proposez au moins ${CRENEAUX_MIN} créneaux (jour de la semaine + tranche horaire), avec une heure de fin après l'heure de début`,
    })
  }

  const acces = await trouverAcces(utilisateur.id, body.moduleId)
  if (!acces) {
    throw createError({ statusCode: 403, statusMessage: 'Ce module ne fait pas partie de vos accès' })
  }

  const formateur = await trouverFormateur(body.formateurId)
  if (!formateur?.coachingPriveActif) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Ce formateur ne propose pas de coaching privé pour le moment',
    })
  }

  return await creerDemandeCoachingPrive({
    utilisateurId: utilisateur.id,
    apprenant: `${utilisateur.prenom} ${utilisateur.nom}`,
    moduleId: body.moduleId,
    formateurId: formateur.id,
    besoins: sujets || `Objectif : ${objectif}\nDifficulté : ${difficulte}`,
    disponibilites: (body.disponibilites ?? '').trim() || '—',
    creneaux: creneaux.map((c) => (c.jour ? { jour: c.jour, debut: c.debut, fin: c.fin } : { date: c.date, debut: c.debut, fin: c.fin })),
    heures,
  })
})
