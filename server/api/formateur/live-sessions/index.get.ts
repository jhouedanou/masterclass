import { exigerLiveVisible } from '../../../utils/live'
import { sessionsLiveFormateur } from '../../../utils/liveFormateur'
import { exigerFormateur } from '../../../utils/session'

/** Onglet « Live Sessions » de l'espace formateur (planche 08, CDC §8). */
export default defineEventHandler(async (event) => {
  await exigerLiveVisible(event)
  const utilisateur = await exigerFormateur(event)
  return await sessionsLiveFormateur(utilisateur)
})
