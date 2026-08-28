import { listerModules } from '../database/catalogue'
import { enregistrerCommande } from '../database/commerce'
import { ouvrirAcces } from '../database/comptes'
import { exigerUtilisateur } from '../utils/session'

/**
 * Simulation du tunnel d'achat. Le paiement réel passe par FeexPay
 * (Mobile Money, Wave, Djamo, Visa) — intégration à faire. La commande et son
 * détail sont désormais enregistrés, avec le prix figé à l'instant de l'achat.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const { moduleIds, moyen } = await readBody<{
    moduleIds: string[]
    moyen?: 'mobile-money' | 'wave' | 'djamo' | 'visa'
  }>(event)

  const modules = await listerModules()
  const achetes = modules.filter((m) => moduleIds?.includes(m.id) && m.statut === 'disponible')
  if (!achetes.length) {
    throw createError({ statusCode: 422, statusMessage: 'Panier vide ou modules indisponibles' })
  }

  const commande = await enregistrerCommande({
    utilisateurId: utilisateur.id,
    lignes: achetes.map((m) => ({ moduleId: m.id, prixFcfa: m.prixFcfa })),
    moyen: moyen ?? 'mobile-money',
  })

  await ouvrirAcces(
    utilisateur.id,
    achetes.map((m) => m.id),
  )

  return {
    ...commande,
    modules: achetes.map((m) => ({ id: m.id, titre: m.titre, slug: m.slug })),
  }
})
