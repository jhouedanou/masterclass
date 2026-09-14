import { filtreDepuisRequete, sessionsFormateur } from '../../utils/formateur'
import { exigerFormateur } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const utilisateur = await exigerFormateur(event)
  const { du, au } = filtreDepuisRequete(getQuery(event))
  return await sessionsFormateur(utilisateur.formateurId!, { du, au })
})
