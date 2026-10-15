import { enregistrerJournal } from '../../database/administration'
import { changerStatutCommande, cloreTransactionsCommande, listerCommandesEnCours } from '../../database/commerce'
import { configFeexPay, verifierEtRapprocher } from '../../utils/feexpay'

/** Délai laissé au client pour valider sur son téléphone avant la première relance. */
const DELAI_RELANCE_MS = 15 * 60 * 1000
/** Au-delà, une commande que FeexPay ne connaît toujours pas est abandonnée. */
const DELAI_ABANDON_MS = 24 * 3600 * 1000

/**
 * Relance des commandes restées « En attente » (planche C, écran 18f).
 *
 * La confirmation passe d'ordinaire par le retour du navigateur ou par le
 * webhook FeexPay. Quand les deux manquent (fenêtre fermée, webhook bloqué),
 * la commande restait en attente pour toujours : 19 dans la base au 15/10
 * (recette, ACH-09). Cette passe repose la question à FeexPay pour chacune :
 * - payée : la commande est confirmée et les accès s'ouvrent, comme au retour
 *   du navigateur ;
 * - refusée : elle passe en échec, avec le motif du prestataire ;
 * - inconnue de FeexPay passé 24 h : le client n'a jamais validé, elle est
 *   close en échec « délai dépassé » pour ne plus encombrer la liste.
 *
 * En simulation il n'y a personne à interroger : la passe ne fait rien.
 */
export async function relancerCommandes() {
  const bilan = { examinees: 0, confirmees: 0, echouees: 0, abandonnees: 0, enAttente: 0, erreurs: 0 }
  if (configFeexPay().mode === 'simulation') return bilan

  const maintenant = Date.now()
  const commandes = (await listerCommandesEnCours()).filter(
    (c) => maintenant - new Date(c.creeeLe).getTime() >= DELAI_RELANCE_MS,
  )

  for (const commande of commandes) {
    bilan.examinees++
    try {
      const resultat = await verifierEtRapprocher(commande.reference)
      if (!resultat) continue
      if (resultat.statut === 'confirmee') {
        bilan.confirmees++
        await enregistrerJournal('Tâche planifiée', 'a confirmé une commande payée restée en attente', commande.reference, {
          type: 'paiement',
          objet: 'commande',
        })
      } else if (resultat.statut === 'echec') {
        bilan.echouees++
      } else if (maintenant - new Date(commande.creeeLe).getTime() >= DELAI_ABANDON_MS) {
        await cloreTransactionsCommande(commande.reference, {
          statut: 'echouee',
          codeEchec: 'delai-depasse',
          detailEchec: 'Aucun paiement reçu chez FeexPay sous 24 h : commande abandonnée.',
        })
        await changerStatutCommande(commande.reference, 'echec')
        bilan.abandonnees++
      } else {
        bilan.enAttente++
      }
    } catch (e) {
      // Une commande qui pose problème (FeexPay muet, transaction d'une autre
      // boutique…) ne doit pas bloquer les suivantes ; elle reste en attente
      // et sera revue à la prochaine passe.
      bilan.erreurs++
      console.error(`[relance] ${commande.reference} :`, (e as Error).message)
    }
  }

  return bilan
}

export default defineTask({
  meta: { name: 'commandes:relancer', description: 'Revérifie auprès de FeexPay les commandes restées en attente' },
  run: async () => ({ result: await relancerCommandes() }),
})
