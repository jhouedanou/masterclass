import { filtreDepuisRequete, statistiquesModules } from '../../utils/formateur'
import { exigerFormateur } from '../../utils/session'

/**
 * « Mes modules — statistiques d'inscription » (planche D, écran 03), avec les
 * filtres « 🗓 Période » et « Module » de l'en-tête.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerFormateur(event)
  return await statistiquesModules(utilisateur.formateurId!, filtreDepuisRequete(getQuery(event)))
})
