import { trouverFormateur } from '../../../../database/catalogue'
import { trouverDemandeCoachingPrive } from '../../../../database/coaching'
import { enregistrerCommande, trouverCommandeDemande } from '../../../../database/commerce'
import { exigerUtilisateur } from '../../../../utils/session'

/**
 * « Accepter et payer » (planche B, écran 10) : l'apprenant accepte le créneau
 * proposé, une commande s'ouvre pour la séance et le tunnel de paiement
 * FeexPay prend le relais (`/achat/paiement?demande=…`).
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const id = getRouterParam(event, 'id') ?? ''
  const { moyen } = await readBody<{ moyen?: 'mobile-money' | 'wave' | 'djamo' | 'visa' }>(event)

  const demande = await trouverDemandeCoachingPrive(id)
  if (!demande || demande.utilisateurId !== utilisateur.id) {
    throw createError({ statusCode: 404, statusMessage: 'Demande introuvable' })
  }
  if (demande.statut !== 'confirmee-attente-paiement') {
    throw createError({ statusCode: 409, statusMessage: 'Aucun créneau proposé à accepter sur cette demande.' })
  }

  const existante = await trouverCommandeDemande(demande.id)
  if (existante && existante.statut !== 'echec') return { commande: existante }

  const formateur = await trouverFormateur(demande.formateurId)
  const total = demande.montantFcfa ?? demande.heures * (formateur?.coachingPriveFcfaHeure ?? 50_000)
  const commande = await enregistrerCommande({
    utilisateurId: utilisateur.id,
    lignes: [],
    moyen: moyen ?? 'mobile-money',
    statut: 'attente',
    demandeCoachingId: demande.id,
    total,
  })
  return { commande }
})
