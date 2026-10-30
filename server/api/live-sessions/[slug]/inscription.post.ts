import { trouverModule } from '../../../database/catalogue'
import { confirmerCommande, enregistrerCommande, enregistrerTransaction, retirerCommande } from '../../../database/commerce'
import { reserverPlaceLive, trouverSessionLiveParSlug } from '../../../database/live'
import { dateCourteLive, heureLive } from '#shared/utils/live'
import {
  CAS_FEEXPAY,
  MOYENS_TRANSACTION,
  configFeexPay,
  descriptionFeexPay,
  finaliserInscriptionLive,
} from '../../../utils/feexpay'
import { exigerLiveVisible } from '../../../utils/live'
import { contexteMeta, type SuiviNavigateur } from '../../../utils/metaCapi'
import { exigerUtilisateur } from '../../../utils/session'

/** Provenance publicitaire acceptée depuis le cookie `em_attribution` (10.B). */
const CLES_ATTRIBUTION = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'ttclid', 'li_fat_id'] as const

function lireAttribution(brut: string | undefined): Record<string, string> {
  if (!brut) return {}
  try {
    const valeurs = JSON.parse(decodeURIComponent(brut)) as Record<string, unknown>
    return Object.fromEntries(
      CLES_ATTRIBUTION.flatMap((cle) => {
        const v = valeurs[cle]
        return typeof v === 'string' && v.trim() ? [[cle, v.trim().slice(0, 200)]] : []
      }),
    )
  } catch {
    return {}
  }
}

/**
 * Inscription à une Live Session, étape paiement (CDC §6, étape 1). Compte
 * obligatoire (RM10). La commande est ouverte d'abord, puis la place réservée
 * 15 minutes en base (`reserver_place_live`, sous verrou) : session publiée,
 * pas encore commencée, module non acquis, capacité respectée. La suite est
 * celle d'un achat de module : fenêtre FeexPay, puis webhook ou retour du
 * navigateur, qui confirment l'inscription (`finaliserInscriptionLive`).
 */
export default defineEventHandler(async (event) => {
  await exigerLiveVisible(event)
  const utilisateur = await exigerUtilisateur(event)
  const { moyen, suivi, cgv } = await readBody<{
    moyen?: 'mobile-money' | 'wave' | 'djamo' | 'visa'
    suivi?: SuiviNavigateur
    /** CGV acceptées et enregistrement de la session noté (planche 04). */
    cgv?: boolean
  }>(event)

  if (cgv !== true) {
    throw createError({ statusCode: 422, statusMessage: 'Acceptez les CGV pour vous inscrire.' })
  }
  const config = useRuntimeConfig()
  if (moyen === 'wave' && !config.public.feexpayWaveActive) {
    throw createError({ statusCode: 422, statusMessage: 'Le paiement par Wave n’est pas encore disponible. Choisissez Mobile Money.' })
  }
  if ((moyen === 'visa' || moyen === 'djamo') && !config.public.feexpayCarteActive) {
    throw createError({ statusCode: 422, statusMessage: 'Le paiement par carte n’est pas encore disponible. Choisissez Mobile Money.' })
  }

  const session = await trouverSessionLiveParSlug(getRouterParam(event, 'slug') ?? '')
  if (!session || session.statut !== 'publiee') {
    throw createError({ statusCode: 404, statusMessage: 'Cette Live Session n’est pas ouverte aux inscriptions' })
  }
  // Fiche ouverte au moment du début : refusé côté serveur aussi (§11).
  if (Date.now() >= new Date(session.debut).getTime()) {
    throw createError({ statusCode: 409, statusMessage: 'Les inscriptions sont closes : la session a commencé' })
  }
  const module = await trouverModule(session.moduleId)
  if (!module) throw createError({ statusCode: 404, statusMessage: 'Module introuvable' })

  const feexpay = configFeexPay()
  const moyenCommande = moyen ?? 'mobile-money'
  // Prix = prix du module (RM1).
  const total = module.prixFcfa

  const commande = await enregistrerCommande({
    utilisateurId: utilisateur.id,
    lignes: [],
    moyen: moyenCommande,
    statut: 'attente',
    sessionLiveId: session.id,
    total,
    suiviMeta: feexpay.mode === 'simulation' ? null : contexteMeta(event, suivi),
  })

  try {
    await reserverPlaceLive({
      sessionId: session.id,
      utilisateurId: utilisateur.id,
      commandeReference: commande.reference,
      attribution: lireAttribution(getCookie(event, 'em_attribution')),
    })
  } catch (erreur) {
    await retirerCommande(commande.reference)
    throw erreur
  }

  // Une inscription = un achat du module (§3.4) : la transaction porte le
  // module, et compte comme une vente dans les revenus et le relevé FeexPay.
  await enregistrerTransaction({
    reference: `${commande.reference}-live`,
    utilisateurId: utilisateur.id,
    moduleId: module.id,
    moyen: MOYENS_TRANSACTION[moyenCommande] ?? 'Orange Money',
    montant: total,
    statut: feexpay.mode === 'simulation' ? 'reussie' : 'en-attente',
    commandeReference: commande.reference,
  })

  // Simulation (développement) : le paiement est joué ici, comme pour un module.
  if (feexpay.mode === 'simulation') {
    await confirmerCommande(commande.reference)
    await finaliserInscriptionLive({ ...commande, statut: 'confirmee' })
    return { reference: commande.reference, statut: 'confirmee' as const, feexpay: null }
  }

  return {
    reference: commande.reference,
    statut: 'attente' as const,
    feexpay: {
      shopId: feexpay.shopId,
      token: feexpay.mode === 'live' ? feexpay.cleApi : 'test_sandbox',
      mode: feexpay.mode === 'live' ? 'LIVE' : 'SANDBOX',
      montant: total,
      customId: commande.reference,
      description: descriptionFeexPay(
        `Live ${dateCourteLive(session.debut)} ${heureLive(session.debut)} - ${module.titre}`,
      ),
      cas: CAS_FEEXPAY[moyenCommande] ?? '',
      email: utilisateur.email,
      prenom: utilisateur.prenom,
      nom: utilisateur.nom,
    },
  }
})
