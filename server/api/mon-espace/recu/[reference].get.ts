import { trouverModule } from '../../../database/catalogue'
import { transactionsDeCommande, trouverCommande } from '../../../database/commerce'
import { trouverDemandeCoachingPrive } from '../../../database/coaching'
import { trouverSessionLive } from '../../../database/live'
import { dateLongueLive, heureLive } from '#shared/utils/live'
import { exigerUtilisateur } from '../../../utils/session'

/**
 * Reçu d'un achat confirmé (CDC 10.C) : numéro, date, libellé, montant,
 * moyen de paiement. Module, Live Session (« Live Session · titre · date de
 * session ») ou séance de coaching privé.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const commande = await trouverCommande(getRouterParam(event, 'reference') ?? '')
  if (!commande || commande.utilisateurId !== utilisateur.id || commande.statut !== 'confirmee') {
    throw createError({ statusCode: 404, statusMessage: 'Reçu introuvable' })
  }
  const transactions = await transactionsDeCommande(commande.reference)
  const reussie = transactions.find((t) => t.statut === 'reussie')

  let lignes: { libelle: string; montant: number }[] = []
  if (commande.sessionLiveId) {
    const live = await trouverSessionLive(commande.sessionLiveId)
    const module = live ? await trouverModule(live.moduleId) : null
    lignes = [{
      libelle: live && module
        ? `Live Session · ${module.titre} · ${dateLongueLive(live.debut, true)} à ${heureLive(live.debut)} GMT`
        : 'Live Session',
      montant: commande.total,
    }]
  } else if (commande.demandeCoachingId) {
    const demande = await trouverDemandeCoachingPrive(commande.demandeCoachingId)
    lignes = [{ libelle: `Coaching privé${demande ? ` · ${demande.heures} h` : ''}`, montant: commande.total }]
  } else {
    const modules = await Promise.all(commande.moduleIds.map(trouverModule))
    lignes = modules.map((m, i) => ({
      libelle: `Module · ${m?.titre ?? commande.moduleIds[i]}`,
      montant: transactions.find((t) => t.moduleId === commande.moduleIds[i])?.montant ?? 0,
    }))
  }

  return {
    numero: commande.reference,
    date: commande.creeeLe,
    client: { nom: `${utilisateur.prenom} ${utilisateur.nom}`, email: utilisateur.email },
    lignes,
    total: commande.total,
    moyen: reussie?.moyen ?? null,
    referencePrestataire: reussie?.referencePrestataire ?? null,
  }
})
