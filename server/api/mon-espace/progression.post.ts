import { acces } from '../../data/db'
import { exigerUtilisateur } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const utilisateur = exigerUtilisateur(event)
  const { moduleId, progression } = await readBody<{ moduleId: string; progression: number }>(event)
  const ligne = acces.find((a) => a.utilisateurId === utilisateur.id && a.moduleId === moduleId)
  if (!ligne) {
    throw createError({ statusCode: 404, statusMessage: 'Module non acquis' })
  }
  ligne.progression = Math.max(0, Math.min(100, Math.round(progression)))
  if (ligne.progression === 100 && !ligne.termineLe) {
    ligne.termineLe = new Date().toISOString().slice(0, 10)
  }
  return ligne
})
