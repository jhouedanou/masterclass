import { filtreDepuisRequete, revenusFormateur } from '../../utils/formateur'
import { exigerFormateur } from '../../utils/session'

/** « Mes revenus » (planche D, écran 06) : mêmes filtres période et module que
 *  l'écran 03, et mêmes bornes pour le relevé mensuel imprimable. */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerFormateur(event)
  return await revenusFormateur(utilisateur.formateurId!, filtreDepuisRequete(getQuery(event)))
})
