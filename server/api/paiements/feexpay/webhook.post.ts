import { trouverCommande, trouverTransactionParPrestataire } from '../../../database/commerce'
import { configFeexPay, lireStatutFeexPay, rapprocherCommande, verifierEtRapprocher } from '../../../utils/feexpay'

/**
 * Webhook FeexPay (tableau de bord → Webhook). Requête POST, corps JSON :
 * `reference`, `status`, `amount`, `callback_info`, `reason`… Il n'est pas
 * signé : on ne lui fait pas confiance, on relit la transaction chez FeexPay
 * par sa référence, puis on l'applique à la commande qu'elle désigne.
 *
 * Toujours répondre 200 une fois le message compris, sinon FeexPay
 * réessaie ; un 4xx n'est renvoyé que pour un appel illégitime ou illisible.
 */
export default defineEventHandler(async (event) => {
  const { webhookCle } = configFeexPay()
  const cle = String(getQuery(event).cle ?? '')
  if (webhookCle && cle !== webhookCle) {
    throw createError({ statusCode: 401, statusMessage: 'Clé de webhook invalide.' })
  }

  const corps = (await readBody<Record<string, unknown>>(event)) ?? {}
  const reference = typeof corps.reference === 'string' ? corps.reference.trim() : ''
  if (!reference) {
    throw createError({ statusCode: 400, statusMessage: 'Référence de transaction absente.' })
  }

  // La commande visée : d'abord ce que dit FeexPay (custom_id), sinon ce que
  // nous avons déjà rapproché, sinon le callback_info que nous avions posé.
  const transaction = await lireStatutFeexPay(reference)
  const infos = corps.callback_info
  const depuisInfos =
    infos && typeof infos === 'object' ? (infos as Record<string, unknown>).commande : null
  const deja = await trouverTransactionParPrestataire(reference)
  const commandeReference =
    transaction?.customId ??
    deja?.commandeReference ??
    (typeof depuisInfos === 'string' ? depuisInfos : null) ??
    (typeof corps.custom_id === 'string' ? corps.custom_id : null)

  if (!commandeReference) {
    // Transaction inconnue de la plateforme (autre boutique, test manuel) :
    // rien à faire, mais pas de quoi faire réessayer FeexPay.
    return { recu: true, ignore: 'commande inconnue' }
  }

  if (transaction) {
    const commande = await trouverCommande(commandeReference)
    if (!commande) return { recu: true, ignore: 'commande introuvable' }
    const resultat = await rapprocherCommande(commande, transaction)
    return { recu: true, statut: resultat.statut }
  }

  const resultat = await verifierEtRapprocher(commandeReference, reference)
  return { recu: true, statut: resultat?.statut ?? 'inconnue' }
})
