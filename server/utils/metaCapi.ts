import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'
import type { Utilisateur } from '#shared/types'
import { lireReglagesTracking } from '../database/backoffice'
import { adresseAppelant } from './reseau'

/**
 * API Conversions de Meta : les événements qui comptent le plus — inscription
 * et paiement — partent aussi du serveur.
 *
 * Le Pixel seul en perd beaucoup : bloqueurs, navigateurs qui coupent les
 * cookies tiers, et surtout le paiement Mobile Money, où le client valide sur
 * son téléphone puis ne revient pas toujours sur la page. Le serveur, lui,
 * apprend la confirmation par le webhook FeexPay ou la tâche de relance.
 * Navigateur et serveur envoient le même `event_id` : Meta n'en compte qu'un.
 *
 * Deux garde-fous :
 * - rien ne part sans le consentement « marketing » du visiteur, transmis par
 *   le navigateur (`useSuivi().contexteSuivi()`) ;
 * - l'envoi ne lève jamais : une mesure manquée ne doit pas faire échouer une
 *   inscription ou une confirmation de paiement.
 */

/** Version de l'API Graph. Meta en maintient chacune deux ans environ. */
const VERSION_GRAPH = 'v24.0'

/** Ce que le navigateur transmet (voir app/composables/useSuivi.ts). */
export interface SuiviNavigateur {
  marketing?: boolean
  fbp?: string
  fbc?: string
  url?: string
}

/** Contexte retenu pour un envoi, éventuellement différé (commande payée plus tard). */
export interface ContexteMeta {
  fbp?: string
  fbc?: string
  url?: string
  ip?: string
  ua?: string
}

export type EvenementServeurMeta = 'CompleteRegistration' | 'Purchase'

/** Pays du formulaire d'inscription → code ISO 3166-1 alpha-2 attendu par Meta. */
const PAYS_ISO: Record<string, string> = {
  'côte d’ivoire': 'ci',
  "côte d'ivoire": 'ci',
  'cote d’ivoire': 'ci',
  "cote d'ivoire": 'ci',
  bénin: 'bj',
  benin: 'bj',
  'burkina faso': 'bf',
  sénégal: 'sn',
  senegal: 'sn',
}

function hacher(valeur: string | undefined | null): string[] | undefined {
  const propre = valeur?.trim().toLowerCase()
  return propre ? [createHash('sha256').update(propre).digest('hex')] : undefined
}

/** Meta veut le numéro en chiffres seuls, indicatif compris. */
function telephone(brut: string | undefined): string | undefined {
  const chiffres = (brut ?? '').replace(/\D/g, '')
  if (!chiffres) return undefined
  // Numéro ivoirien saisi sans indicatif (10 chiffres, 01, 05 ou 07).
  if (chiffres.length === 10 && /^0[157]/.test(chiffres)) return `225${chiffres}`
  return chiffres
}

/**
 * Le contexte à retenir pour un événement serveur, ou `null` sans
 * consentement marketing. Les valeurs sont bornées : elles viennent du
 * navigateur et finissent en base pour une commande.
 */
export function contexteMeta(event: H3Event, suivi: SuiviNavigateur | undefined): ContexteMeta | null {
  if (suivi?.marketing !== true) return null
  const borne = (v: unknown, max: number) => (typeof v === 'string' && v ? v.slice(0, max) : undefined)
  const ip = adresseAppelant(event)
  return {
    fbp: borne(suivi.fbp, 200),
    fbc: borne(suivi.fbc, 500),
    url: borne(suivi.url, 500),
    ip: ip === 'inconnue' ? undefined : ip,
    ua: borne(getRequestHeader(event, 'user-agent'), 500),
  }
}

export async function envoyerEvenementMeta(evenement: {
  nom: EvenementServeurMeta
  eventId: string
  utilisateur: Utilisateur
  contexte: ContexteMeta
  donnees?: { valeur?: number; contentIds?: string[]; reference?: string }
}): Promise<void> {
  try {
    // La simulation de paiement ne doit pas gonfler les conversions du client.
    if ((useRuntimeConfig().feexpayMode || 'simulation') === 'simulation' && evenement.nom === 'Purchase') return

    const { metaPixelId, metaCapiJeton } = await lireReglagesTracking()
    if (!metaPixelId || !metaCapiJeton) return

    const { utilisateur, contexte, donnees } = evenement
    const corps: Record<string, unknown> = {
      data: [
        {
          event_name: evenement.nom,
          event_time: Math.floor(Date.now() / 1000),
          event_id: evenement.eventId,
          action_source: 'website',
          event_source_url: contexte.url,
          user_data: {
            em: hacher(utilisateur.email),
            ph: hacher(telephone(utilisateur.whatsapp)),
            fn: hacher(utilisateur.prenom),
            ln: hacher(utilisateur.nom),
            country: hacher(PAYS_ISO[(utilisateur.pays ?? '').trim().toLowerCase()]),
            external_id: hacher(utilisateur.id),
            client_ip_address: contexte.ip,
            client_user_agent: contexte.ua,
            fbp: contexte.fbp,
            fbc: contexte.fbc,
          },
          custom_data: {
            currency: 'XOF',
            ...(donnees?.valeur !== undefined ? { value: donnees.valeur } : {}),
            ...(donnees?.contentIds?.length
              ? { content_ids: donnees.contentIds, content_type: 'product' }
              : {}),
            ...(donnees?.reference ? { order_id: donnees.reference } : {}),
          },
        },
      ],
    }
    // Code de l'onglet « Tester les événements » du gestionnaire d'événements :
    // les envois y apparaissent sans compter dans les statistiques.
    const codeTest = process.env.META_CAPI_TEST_CODE
    if (codeTest) corps.test_event_code = codeTest

    await $fetch(`https://graph.facebook.com/${VERSION_GRAPH}/${encodeURIComponent(metaPixelId)}/events`, {
      method: 'POST',
      // Le jeton dans le corps, pas dans l'adresse : une URL finit dans les journaux.
      body: { ...corps, access_token: metaCapiJeton },
      timeout: 8000,
    })
  } catch (erreur) {
    const e = erreur as { data?: { error?: { message?: string } }; message?: string }
    console.error('[meta-capi] événement non transmis', evenement.nom, evenement.eventId, e.data?.error?.message ?? e.message ?? erreur)
  }
}
