import { listerInscriptionsUtilisateur } from '../../../database/coaching'
import { listerCertificatsUtilisateur } from '../../../database/commerce'
import { listerAccesUtilisateur } from '../../../database/comptes'
import { exigerUtilisateur } from '../../../utils/session'

/** Écran 1 du parcours de suppression : ce que l'apprenant perdrait, chiffré. */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const [acces, certificats, inscriptions] = await Promise.all([
    listerAccesUtilisateur(utilisateur.id),
    listerCertificatsUtilisateur(utilisateur.id),
    listerInscriptionsUtilisateur(utilisateur.id),
  ])
  return {
    modules: acces.filter((a) => !a.revoqueLe).length,
    certificats: certificats.length,
    sessions: inscriptions.length,
  }
})
