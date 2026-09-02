import type { CodeEchecPaiement } from '#shared/types'
import { listerModules } from '../database/catalogue'
import { enregistrerCommande, enregistrerTransaction } from '../database/commerce'
import { ouvrirAcces } from '../database/comptes'
import type { MoyenTransactionSql } from '../database/types'
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

/**
 * Tunnel d'achat, étape 3. Le paiement réel passe par FeexPay (Mobile Money,
 * Wave, Djamo, Visa) — intégration à faire : l'échange avec le prestataire
 * est simulé, mais tout ce qui l'entoure est en place. Un échec enregistre la
 * transaction avec son motif et répond 402 avec le code, que le tunnel
 * traduit en message et en action ; un succès enregistre la commande, la
 * transaction et ouvre les accès.
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

  const moyenTransaction = MOYENS[moyen ?? 'mobile-money'] ?? 'Orange Money'

  if (simulerEchec && process.env.NODE_ENV !== 'production' && CODES_ECHEC.includes(simulerEchec)) {
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
    moyen: moyen ?? 'mobile-money',
  })

  for (const m of achetes) {
    await enregistrerTransaction({
      reference: referenceFeexPay(),
      utilisateurId: utilisateur.id,
      moduleId: m.id,
      moyen: moyenTransaction,
      montant: m.prixFcfa,
      statut: 'reussie',
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
