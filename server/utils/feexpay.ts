import type { CodeEchecPaiement, Commande } from '#shared/types'
import { ouvrirAcces } from '../database/comptes'
import {
  changerStatutCommande,
  cloreTransactionsCommande,
  transactionsDeCommande,
  trouverCommande,
} from '../database/commerce'
import type { MoyenTransactionSql } from '../database/types'

/**
 * FeexPay (docs.feexpay.me) : encaissement Mobile Money, Wave et carte.
 *
 * Trois modes, réglés par `FEEXPAY_MODE` :
 * - `simulation` : aucun appel au prestataire, la commande est confirmée
 *   d'emblée (développement ; refusé en production) ;
 * - `sandbox` / `live` : le navigateur ouvre la fenêtre FeexPay (SDK
 *   JavaScript) avec la boutique, la clé et la référence de commande ; le
 *   serveur ne tient jamais pour acquis ce que dit le navigateur ou le
 *   webhook, il interroge l'API de statut avant d'ouvrir les accès.
 *
 * Le webhook FeexPay n'est pas signé : il ne sert que de déclencheur, la
 * vérification par l'API reste la seule source de vérité. Une clé partagée
 * (`FEEXPAY_WEBHOOK_CLE`, passée en paramètre d'URL) filtre les appels
 * étrangers.
 */
export type ModeFeexPay = 'simulation' | 'sandbox' | 'live'

export interface ConfigFeexPay {
  mode: ModeFeexPay
  shopId: string
  cleApi: string
  baseUrl: string
  webhookCle: string
}

export function configFeexPay(): ConfigFeexPay {
  const config = useRuntimeConfig()
  const brut = (process.env.FEEXPAY_MODE || config.feexpayMode || 'simulation').trim().toLowerCase()
  const mode: ModeFeexPay = brut === 'live' || brut === 'sandbox' ? brut : 'simulation'

  if (mode === 'simulation' && process.env.NODE_ENV === 'production') {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Paiement non configuré : renseignez FEEXPAY_MODE (sandbox ou live), FEEXPAY_SHOP_ID et FEEXPAY_API_KEY.',
    })
  }

  const shopId = (process.env.FEEXPAY_SHOP_ID || config.feexpayShopId || '').trim()
  const cleApi = (process.env.FEEXPAY_API_KEY || config.feexpayApiKey || '').trim()
  if (mode !== 'simulation' && (!shopId || !cleApi)) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Paiement non configuré : FEEXPAY_SHOP_ID et FEEXPAY_API_KEY sont requis.',
    })
  }

  return {
    mode,
    shopId,
    cleApi,
    baseUrl: (process.env.FEEXPAY_BASE_URL || config.feexpayBaseUrl || 'https://api-v2.feexpay.me').replace(/\/$/, ''),
    webhookCle: (process.env.FEEXPAY_WEBHOOK_CLE || config.feexpayWebhookCle || '').trim(),
  }
}

// --- Lecture du prestataire -------------------------------------------------

export type StatutFeexPay = 'SUCCESSFUL' | 'FAILED' | 'PENDING'

export interface TransactionFeexPay {
  reference: string
  statut: StatutFeexPay
  montant: number
  /** Notre référence de commande, transmise comme `custom_id`. */
  customId: string | null
  reseau: string | null
  motif: string | null
}

/** Les réponses FeexPay varient d'un point d'entrée à l'autre (objet nu ou
 *  enveloppé dans `data`, `phoneNumber` ou `phone_number`…) : on lit large. */
function lireTransaction(brut: unknown): TransactionFeexPay | null {
  if (!brut || typeof brut !== 'object') return null
  const enveloppe = brut as Record<string, unknown>
  const source = (
    enveloppe.data && typeof enveloppe.data === 'object' && !Array.isArray(enveloppe.data)
      ? enveloppe.data
      : enveloppe
  ) as Record<string, unknown>

  const reference = typeof source.reference === 'string' ? source.reference : null
  const statutBrut = String(source.status ?? '').toUpperCase()
  if (!reference || !statutBrut) return null

  const statut: StatutFeexPay =
    statutBrut === 'SUCCESSFUL' || statutBrut === 'SUCCESS' || statutBrut === 'COMPLETED'
      ? 'SUCCESSFUL'
      : statutBrut === 'FAILED' || statutBrut === 'CANCELED' || statutBrut === 'CANCELLED'
        ? 'FAILED'
        : 'PENDING'

  const infos = source.callback_info
  const customDepuisInfos =
    infos && typeof infos === 'object' ? (infos as Record<string, unknown>).commande : null

  return {
    reference,
    statut,
    montant: Number(source.amount ?? 0),
    customId:
      typeof source.custom_id === 'string'
        ? source.custom_id
        : typeof customDepuisInfos === 'string'
          ? customDepuisInfos
          : null,
    reseau: typeof source.reseau === 'string' ? source.reseau : null,
    motif: typeof source.reason === 'string' && source.reason ? source.reason : null,
  }
}

async function appeler(chemin: string, options: { method?: 'GET' | 'POST'; body?: Record<string, unknown> } = {}) {
  const { baseUrl, cleApi } = configFeexPay()
  try {
    return await $fetch<unknown>(`${baseUrl}${chemin}`, {
      method: options.method ?? 'GET',
      body: options.body,
      headers: { Authorization: `Bearer ${cleApi}`, 'Content-Type': 'application/json' },
      timeout: 15_000,
    })
  } catch (e) {
    const statut = (e as { statusCode?: number }).statusCode
    if (statut === 404) return null
    throw createError({
      statusCode: 502,
      statusMessage: `FeexPay ne répond pas (${(e as Error).message}).`,
    })
  }
}

/** Statut d'une transaction par sa référence FeexPay. */
export async function lireStatutFeexPay(reference: string): Promise<TransactionFeexPay | null> {
  const brut = await appeler(`/api/transactions/public/single/status/${encodeURIComponent(reference)}`)
  return lireTransaction(brut)
}

/**
 * Retrouve une transaction du jour par notre référence de commande, quand le
 * navigateur n'a pas pu remonter la référence FeexPay (fenêtre fermée avant
 * le rappel, rechargement de la page…).
 */
export async function rechercherParCommandeFeexPay(customId: string): Promise<TransactionFeexPay | null> {
  const { shopId } = configFeexPay()
  const jour = (d: Date) => d.toISOString().slice(0, 10)
  const hier = new Date(Date.now() - 24 * 3600 * 1000)
  const brut = await appeler('/api/transactions/history', {
    method: 'POST',
    body: {
      start_date: jour(hier),
      end_date: jour(new Date()),
      shop: shopId,
      type: 'ALL',
      status: 'ALL',
      reseau: 'ALL',
    },
  })
  const lignes = (brut as { data?: unknown[] } | null)?.data
  if (!Array.isArray(lignes)) return null
  const candidates = lignes.map(lireTransaction).filter((t): t is TransactionFeexPay => t?.customId === customId)
  // Une réussite prime sur un échec antérieur (nouvelle tentative).
  return candidates.find((t) => t.statut === 'SUCCESSFUL') ?? candidates[0] ?? null
}

// --- Traduction des réponses ----------------------------------------------

/** Réseau restitué par FeexPay → famille de moyen suivie dans `transactions`. */
export function moyenDepuisReseau(reseau: string | null): MoyenTransactionSql | null {
  const r = (reseau ?? '').toUpperCase()
  if (!r) return null
  if (r.includes('ORANGE')) return 'Orange Money'
  if (r.includes('MTN')) return 'MTN Money'
  if (r.includes('MOOV')) return 'Moov Money'
  if (r.includes('WAVE')) return 'Wave'
  if (r.includes('DJAMO')) return 'Djamo'
  if (r.includes('CARD') || r.includes('VISA') || r.includes('MASTER') || r.includes('CARTE')) return 'Visa'
  return null
}

/** Motif FeexPay → l'un des six cas d'erreur du tunnel (planche A, 04c). */
export function codeEchecDepuisMotif(motif: string | null, reseau: string | null): CodeEchecPaiement {
  const m = (motif ?? '').toUpperCase()
  if (!m) return 'erreur-inconnue'
  if (m.includes('INSUFFICIENT') || m.includes('BALANCE') || m.includes('SOLDE') || m.includes('FUNDS')) {
    return 'solde-insuffisant'
  }
  if (m.includes('CANCEL') || m.includes('REJECT') || m.includes('REFUS') || m.includes('ANNUL') || m.includes('DENIED')) {
    return 'annule-utilisateur'
  }
  if (m.includes('TIMEOUT') || m.includes('EXPIR') || m.includes('DELAI') || m.includes('DÉLAI')) {
    return 'delai-depasse'
  }
  if (m.includes('DECLINED') || m.includes('CARD') || moyenDepuisReseau(reseau) === 'Visa') {
    return 'carte-refusee'
  }
  if (m.includes('PAYER_NOT_FOUND') || m.includes('NETWORK') || m.includes('OPERATOR') || m.includes('RESEAU') || m.includes('UNAVAILABLE')) {
    return 'reseau-operateur'
  }
  return 'erreur-inconnue'
}

// --- Rapprochement ---------------------------------------------------------

export type ResultatRapprochement =
  | { statut: 'confirmee'; commande: Commande }
  | { statut: 'attente'; commande: Commande }
  | { statut: 'echec'; commande: Commande; codeEchec: CodeEchecPaiement; detail: string }

/**
 * Applique à une commande ce que dit FeexPay. Idempotent : une commande déjà
 * close n'est pas retouchée, et deux rapprochements concurrents (webhook et
 * navigateur) convergent vers le même état.
 */
export async function rapprocherCommande(
  commande: Commande,
  transaction: TransactionFeexPay,
): Promise<ResultatRapprochement> {
  if (commande.statut === 'confirmee') return { statut: 'confirmee', commande }

  if (transaction.customId && transaction.customId !== commande.reference) {
    throw createError({ statusCode: 409, statusMessage: 'La transaction FeexPay ne correspond pas à cette commande.' })
  }

  if (transaction.statut === 'PENDING') {
    if (commande.statut !== 'verification') await changerStatutCommande(commande.reference, 'verification')
    return { statut: 'attente', commande: { ...commande, statut: 'verification' } }
  }

  if (transaction.statut === 'FAILED') {
    const codeEchec = codeEchecDepuisMotif(transaction.motif, transaction.reseau)
    const detail = transaction.motif ?? 'Paiement refusé par le prestataire.'
    await cloreTransactionsCommande(commande.reference, {
      statut: 'echouee',
      referencePrestataire: transaction.reference,
      reseau: transaction.reseau ?? undefined,
      moyen: moyenDepuisReseau(transaction.reseau) ?? undefined,
      codeEchec,
      detailEchec: detail,
    })
    await changerStatutCommande(commande.reference, 'echec')
    return { statut: 'echec', commande: { ...commande, statut: 'echec' }, codeEchec, detail }
  }

  // Réussite : le montant encaissé doit couvrir la commande, sinon on n'ouvre
  // rien et on laisse une trace lisible pour l'administration.
  if (transaction.montant + 0.5 < commande.total) {
    const detail = `Montant encaissé (${transaction.montant}) inférieur au total de la commande (${commande.total}).`
    await cloreTransactionsCommande(commande.reference, {
      statut: 'echouee',
      referencePrestataire: transaction.reference,
      reseau: transaction.reseau ?? undefined,
      codeEchec: 'erreur-inconnue',
      detailEchec: detail,
    })
    await changerStatutCommande(commande.reference, 'echec')
    return { statut: 'echec', commande: { ...commande, statut: 'echec' }, codeEchec: 'erreur-inconnue', detail }
  }

  await cloreTransactionsCommande(commande.reference, {
    statut: 'reussie',
    referencePrestataire: transaction.reference,
    reseau: transaction.reseau ?? undefined,
    moyen: moyenDepuisReseau(transaction.reseau) ?? undefined,
  })
  await changerStatutCommande(commande.reference, 'confirmee')

  const modules = commande.moduleIds.length
    ? commande.moduleIds
    : (await transactionsDeCommande(commande.reference)).map((t) => t.moduleId)
  await ouvrirAcces(commande.utilisateurId, modules)

  return { statut: 'confirmee', commande: { ...commande, statut: 'confirmee' } }
}

/**
 * Point commun de la confirmation navigateur et du webhook : retrouve la
 * transaction chez FeexPay (par sa référence, sinon par notre référence de
 * commande) et l'applique.
 */
export async function verifierEtRapprocher(
  commandeReference: string,
  referenceFeexPay?: string | null,
): Promise<ResultatRapprochement | null> {
  const commande = await trouverCommande(commandeReference)
  if (!commande) return null
  if (commande.statut === 'confirmee') return { statut: 'confirmee', commande }
  // En simulation, il n'y a personne à interroger : l'état de la commande fait foi.
  if (configFeexPay().mode === 'simulation') {
    return commande.statut === 'echec'
      ? { statut: 'echec', commande, codeEchec: 'erreur-inconnue', detail: 'Paiement simulé en échec.' }
      : { statut: 'attente', commande }
  }

  let transaction: TransactionFeexPay | null = null
  if (referenceFeexPay) transaction = await lireStatutFeexPay(referenceFeexPay)
  if (!transaction) transaction = await rechercherParCommandeFeexPay(commande.reference)
  if (!transaction) return { statut: 'attente', commande }

  return await rapprocherCommande(commande, transaction)
}
