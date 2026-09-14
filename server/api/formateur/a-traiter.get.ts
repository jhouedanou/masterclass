import { aTraiterFormateur } from '../../utils/formateur'
import { exigerFormateur } from '../../utils/session'

/** Compteurs du bloc « À traiter » et de la pastille « Coaching privé 2 » de
 *  la navigation (planche D, écran 01). */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerFormateur(event)
  return await aTraiterFormateur(utilisateur.formateurId!)
})
