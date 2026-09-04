import { trouverCommande } from '../../../database/commerce'
import { verifierEtRapprocher } from '../../../utils/feexpay'
import { exigerUtilisateur } from '../../../utils/session'

/**
 * Tunnel d'achat, retour de la fenêtre FeexPay. Le navigateur transmet la
 * référence FeexPay que le SDK lui a rendue (si elle est connue) ; le serveur
 * vérifie auprès du prestataire et répond :
 * - 200 `{ statut: 'confirmee' }` : accès ouverts ;
 * - 200 `{ statut: 'attente' }` : FeexPay n'a pas encore tranché, réessayer ;
 * - 402 `{ code }` : échec, avec le motif traduit pour l'écran 04c.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const reference = getRouterParam(event, 'reference') ?? ''
  const { referenceFeexPay } = await readBody<{ referenceFeexPay?: string | null }>(event)

  const commande = await trouverCommande(reference)
  if (!commande || commande.utilisateurId !== utilisateur.id) {
    throw createError({ statusCode: 404, statusMessage: 'Commande introuvable.' })
  }

  const resultat = await verifierEtRapprocher(reference, referenceFeexPay?.trim() || null)
  if (!resultat) throw createError({ statusCode: 404, statusMessage: 'Commande introuvable.' })

  if (resultat.statut === 'echec') {
    throw createError({
      statusCode: 402,
      statusMessage: resultat.detail,
      data: { code: resultat.codeEchec },
    })
  }

  return { statut: resultat.statut, reference: resultat.commande.reference }
})
