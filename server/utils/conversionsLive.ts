import { createHash } from 'node:crypto'
import type { Commande, Utilisateur } from '#shared/types'
import { lireReglagesTracking } from '../database/backoffice'
import { attributionInscriptionLive } from '../database/live'

/**
 * Inscription confirmée vers TikTok (Events API) et LinkedIn (Conversions
 * API), selon la provenance enregistrée sur l'inscription (CDC 10.B). Meta
 * passe par `signalerAchatMeta` (server/utils/feexpay.ts), comme les achats
 * de modules.
 *
 * L'identifiant de clic (`ttclid`, `li_fat_id`) n'est enregistré qu'avec le
 * consentement marketing (app/plugins/attribution.client.ts) : sans lui,
 * rien ne part. Ne lève jamais.
 */

function empreinte(valeur: string): string {
  return createHash('sha256').update(valeur.trim().toLowerCase()).digest('hex')
}

export async function envoyerConversionsLive(
  inscriptionId: string,
  apprenant: Utilisateur,
  commande: Commande,
): Promise<void> {
  try {
    const config = useRuntimeConfig()
    // La simulation de paiement ne doit pas gonfler les conversions.
    if ((config.feexpayMode || 'simulation') === 'simulation') return
    const attribution = await attributionInscriptionLive(inscriptionId)
    if (!attribution) return
    const eventId = `achat-${commande.reference}`

    if (attribution.ttclid && config.tiktokEventsJeton) {
      const { tiktokPixelId } = await lireReglagesTracking()
      if (tiktokPixelId) {
        await $fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
          method: 'POST',
          headers: { 'Access-Token': config.tiktokEventsJeton },
          body: {
            event_source: 'web',
            event_source_id: tiktokPixelId,
            data: [
              {
                event: 'CompletePayment',
                event_time: Math.floor(Date.now() / 1000),
                event_id: eventId,
                user: { email: empreinte(apprenant.email), ttclid: attribution.ttclid },
                properties: {
                  currency: 'XOF',
                  value: commande.total,
                  content_type: 'product',
                  content_category: 'live_session',
                },
              },
            ],
          },
          timeout: 10_000,
        })
      }
    }

    if (attribution.liFatId && config.linkedinCapiJeton && config.linkedinConversionId) {
      await $fetch('https://api.linkedin.com/rest/conversionEvents', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.linkedinCapiJeton}`,
          'LinkedIn-Version': '202405',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: {
          conversion: `urn:lla:llaPartnerConversion:${config.linkedinConversionId}`,
          conversionHappenedAt: Date.now(),
          conversionValue: { currencyCode: 'XOF', amount: String(commande.total) },
          eventId,
          user: {
            userIds: [
              { idType: 'SHA256_EMAIL', idValue: empreinte(apprenant.email) },
              { idType: 'LINKEDIN_FIRST_PARTY_ADS_TRACKING_UUID', idValue: attribution.liFatId },
            ],
          },
        },
        timeout: 10_000,
      })
    }
  } catch (erreur) {
    console.error('[conversions-live] inscription non signalée', commande.reference, (erreur as Error)?.message ?? erreur)
  }
}
