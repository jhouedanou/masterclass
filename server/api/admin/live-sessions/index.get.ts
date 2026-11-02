import { listerFormateurs } from '../../../database/catalogue'
import { listerLiveSessions } from '../../../database/live'
import { exigerSection } from '../../../utils/session'

/** Toutes les Live Sessions, brouillons compris, et les formateurs pour le formulaire. */
export default defineEventHandler(async (event) => {
  await exigerSection(event, 'calendrier-sessions')
  const [sessions, formateurs] = await Promise.all([listerLiveSessions(), listerFormateurs()])
  return {
    sessions: [...sessions].reverse(),
    formateurs: formateurs.map((f) => ({ id: f.id, nom: f.nom })),
  }
})
