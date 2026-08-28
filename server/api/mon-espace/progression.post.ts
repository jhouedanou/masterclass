import { majProgression } from '../../database/comptes'
import { exigerUtilisateur } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const { moduleId, progression } = await readBody<{ moduleId: string; progression: number }>(event)
  return await majProgression(utilisateur.id, moduleId, progression)
})
