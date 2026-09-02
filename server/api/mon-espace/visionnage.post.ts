import { enregistrerVisionnage } from '../../database/comptes'
import { exigerUtilisateur } from '../../utils/session'

/**
 * Relevé du temps réellement visionné, envoyé toutes les dix secondes par le
 * lecteur. C'est ce cumul, et non la position du curseur, qui fait avancer la
 * progression : l'avance rapide ne valide pas un chapitre.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const { moduleId, position, secondesVues } = await readBody<{
    moduleId: string
    position: number
    secondesVues: number
  }>(event)

  if (!moduleId || !Number.isInteger(position) || position < 0) {
    throw createError({ statusCode: 422, statusMessage: 'Chapitre non identifié' })
  }
  if (!Number.isFinite(secondesVues) || secondesVues < 0) {
    throw createError({ statusCode: 422, statusMessage: 'Temps de visionnage invalide' })
  }

  const progression = await enregistrerVisionnage(
    utilisateur.id,
    moduleId,
    position,
    Math.round(secondesVues),
  )
  return { progression }
})
