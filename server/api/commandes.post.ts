import type { CodeEchecPaiement } from '#shared/types'
import { listerModules } from '../database/catalogue'
import { enregistrerCommande, enregistrerTransaction } from '../database/commerce'
import { ouvrirAcces } from '../database/comptes'
import type { MoyenTransactionSql } from '../database/types'
import { configFeexPay } from '../utils/feexpay'
import { exigerUtilisateur } from '../utils/session'

/** Motifs d'échec tels que le prestataire les remonte (planche A, écran 04c). */
const CODES_ECHEC: CodeEchecPaiement[] = [
  'solde-insuffisant',
  'annule-utilisateur',
  'delai-depasse',
  'reseau-operateur',
  'carte-refusee',
  'erreur-inconnue',
]

const DETAILS: Record<CodeEchecPaiement, string> = {
  'solde-insuffisant': 'Solde insuffisant sur le compte.',
  'annule-utilisateur': 'Paiement annulé par l’utilisateur.',
  'delai-depasse': 'Aucune validation dans le délai imparti.',
  'reseau-operateur': 'L’opérateur n’a pas répondu.',
  'carte-refusee': 'Carte refusée par la banque émettrice.',
  'erreur-inconnue': 'Erreur non identifiée côté prestataire.',
}

/** Le moyen choisi dans le tunnel, projeté sur les libellés du prestataire.
 *  L'opérateur Mobile Money exact n'est connu qu'au retour FeexPay. */
const MOYENS: Record<string, MoyenTransactionSql> = {
  'mobile-money': 'Orange Money',
  wave: 'Wave',
  djamo: 'Djamo',
  visa: 'Visa',
}

function referenceFeexPay(): string {
  const d = new Date()
  const jour = `${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}`
  return `FP-${jour}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
}

/** Type de fenêtre FeexPay selon le moyen choisi ; vide = tous les moyens. */
const CAS_FEEXPAY: Record<string, 'MOBILE' | 'CARD' | ''> = {
  'mobile-money': 'MOBILE',
  wave: '',
  djamo: '',
  visa: 'CARD',
}

/**
 * Tunnel d'achat, étape 3 : ouverture de la commande.
 *
 * - En `simulation` (développement), l'échange avec FeexPay est joué ici :
 *   la commande est confirmée d'emblée, ou échoue avec le motif demandé.
 * - En `sandbox` / `live`, la commande naît `attente` avec une transaction en
 *   attente par module, et la réponse porte ce qu'il faut au navigateur pour
 *   ouvrir la fenêtre FeexPay. La suite se joue dans
 *   `POST /api/commandes/:reference/confirmer` et le webhook.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const { moduleIds, moyen, simulerEchec } = await readBody<{
    moduleIds: string[]
    moyen?: 'mobile-money' | 'wave' | 'djamo' | 'visa'
    /** Hors production seulement : force un des six motifs d'échec. */
    simulerEchec?: CodeEchecPaiement
  }>(event)

  const modules = await listerModules()
  const achetes = modules.filter((m) => moduleIds?.includes(m.id) && m.statut === 'disponible')
  if (!achetes.length) {
    throw createError({ statusCode: 422, statusMessage: 'Panier vide ou modules indisponibles' })
  }

  const moyenCommande = moyen ?? 'mobile-money'
  const moyenTransaction = MOYENS[moyenCommande] ?? 'Orange Money'
  const feexpay = configFeexPay()

  // --- Prestataire branché : commande en attente, fenêtre FeexPay ---------
  if (feexpay.mode !== 'simulation') {
    const commande = await enregistrerCommande({
      utilisateurId: utilisateur.id,
      lignes: achetes.map((m) => ({ moduleId: m.id, prixFcfa: m.prixFcfa })),
      moyen: moyenCommande,
      statut: 'attente',
    })
    for (const m of achetes) {
      await enregistrerTransaction({
        reference: `${commande.reference}-${m.id}`,
        utilisateurId: utilisateur.id,
        moduleId: m.id,
        moyen: moyenTransaction,
        montant: m.prixFcfa,
        statut: 'en-attente',
        commandeReference: commande.reference,
      })
    }
    return {
      ...commande,
      modules: achetes.map((m) => ({ id: m.id, titre: m.titre, slug: m.slug })),
      feexpay: {
        shopId: feexpay.shopId,
        // En SANDBOX, le SDK FeexPay ne contacte pas le prestataire : il joue
        // un succès sur place et refuse une clé de production (`fp_…`). Le
        // jeton n'y sert donc à rien ; la vraie clé ne part qu'en LIVE.
        token: feexpay.mode === 'live' ? feexpay.cleApi : 'test_sandbox',
        mode: feexpay.mode === 'live' ? 'LIVE' : 'SANDBOX',
        montant: commande.total,
        customId: commande.reference,
        description: achetes.map((m) => m.titre).join(' + ').slice(0, 120),
        cas: CAS_FEEXPAY[moyenCommande] ?? '',
        email: utilisateur.email,
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
      },
    }
  }

  // --- Simulation (développement) ----------------------------------------
  if (simulerEchec && CODES_ECHEC.includes(simulerEchec)) {
    for (const m of achetes) {
      await enregistrerTransaction({
        reference: referenceFeexPay(),
        utilisateurId: utilisateur.id,
        moduleId: m.id,
        moyen: moyenTransaction,
        montant: m.prixFcfa,
        statut: 'echouee',
        codeEchec: simulerEchec,
        detailEchec: DETAILS[simulerEchec],
      })
    }
    throw createError({
      statusCode: 402,
      statusMessage: DETAILS[simulerEchec],
      data: { code: simulerEchec },
    })
  }

  const commande = await enregistrerCommande({
    utilisateurId: utilisateur.id,
    lignes: achetes.map((m) => ({ moduleId: m.id, prixFcfa: m.prixFcfa })),
    moyen: moyenCommande,
  })

  for (const m of achetes) {
    await enregistrerTransaction({
      reference: referenceFeexPay(),
      utilisateurId: utilisateur.id,
      moduleId: m.id,
      moyen: moyenTransaction,
      montant: m.prixFcfa,
      statut: 'reussie',
      commandeReference: commande.reference,
    })
  }

  await ouvrirAcces(
    utilisateur.id,
    achetes.map((m) => m.id),
  )

  return {
    ...commande,
    modules: achetes.map((m) => ({ id: m.id, titre: m.titre, slug: m.slug })),
  }
})
