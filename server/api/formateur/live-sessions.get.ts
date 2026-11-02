import { listerLiveSessions } from '../../database/live'
import { exigerFormateur } from '../../utils/session'

/** Les Live Sessions animées par le formateur connecté, brouillons exclus. */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerFormateur(event)
  return (await listerLiveSessions()).filter(
    (s) => s.formateurId === utilisateur.formateurId && s.statut !== 'brouillon',
  )
})
