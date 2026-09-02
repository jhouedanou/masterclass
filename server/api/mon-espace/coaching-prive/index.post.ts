import type { CreneauCoaching } from '#shared/types'
import { trouverFormateur } from '../../../database/catalogue'
import { creerDemandeCoachingPrive } from '../../../database/coaching'
import { trouverAcces } from '../../../database/comptes'
import { exigerUtilisateur } from '../../../utils/session'

/** Une séance va d'une heure à une demi-journée ; au-delà, l'équipe découpe. */
const HEURES_MAX = 4
const CRENEAUX_MAX = 3
const LONGUEUR_MIN = 20

function creneauValide(c: CreneauCoaching): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.date ?? '')) return false
  if (!/^\d{2}:\d{2}$/.test(c.debut ?? '') || !/^\d{2}:\d{2}$/.test(c.fin ?? '')) return false
  if (c.fin <= c.debut) return false
  return c.date >= new Date().toISOString().slice(0, 10)
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
    objectif?: string
    difficulte?: string
    disponibilites?: string
    creneaux?: CreneauCoaching[]
    heures?: number
  }>(event)

  const objectif = (body.objectif ?? '').trim()
  const difficulte = (body.difficulte ?? '').trim()
  const heures = Number(body.heures)
  const creneaux = Array.isArray(body.creneaux) ? body.creneaux : []

  if (!body.moduleId || !body.formateurId) {
    throw createError({ statusCode: 422, statusMessage: 'Module et formateur sont obligatoires' })
  }
  if (objectif.length < LONGUEUR_MIN || difficulte.length < LONGUEUR_MIN) {
    throw createError({
      statusCode: 422,
      statusMessage: `Décrivez votre objectif et votre difficulté (${LONGUEUR_MIN} caractères minimum chacun)`,
    })
  }
  if (!Number.isInteger(heures) || heures < 1 || heures > HEURES_MAX) {
    throw createError({ statusCode: 422, statusMessage: `Entre 1 et ${HEURES_MAX} heures` })
  }
  if (!creneaux.length || creneaux.length > CRENEAUX_MAX || !creneaux.every(creneauValide)) {
    throw createError({
      statusCode: 422,
      statusMessage: `Proposez de 1 à ${CRENEAUX_MAX} créneaux à venir, avec une heure de fin après l'heure de début`,
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
    // Les deux réponses obligatoires tiennent dans le champ « besoins ».
    besoins: `Objectif : ${objectif}\nDifficulté : ${difficulte}`,
    disponibilites: (body.disponibilites ?? '').trim() || '—',
    creneaux: creneaux.map((c) => ({ date: c.date, debut: c.debut, fin: c.fin })),
    heures,
  })
})
