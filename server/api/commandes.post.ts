import { acces, commandes, modules } from '../data/db'
import { exigerUtilisateur } from '../utils/session'

/**
 * Simulation du tunnel d'achat. Le paiement réel passe par FeexPay
 * (Mobile Money, Wave, Djamo, Visa) — intégration à faire.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = exigerUtilisateur(event)
  const { moduleIds, moyen } = await readBody<{
    moduleIds: string[]
    moyen?: 'mobile-money' | 'wave' | 'djamo' | 'visa'
  }>(event)

  const achetes = modules.filter((m) => moduleIds?.includes(m.id) && m.statut === 'disponible')
  if (!achetes.length) {
    throw createError({ statusCode: 422, statusMessage: 'Panier vide ou modules indisponibles' })
  }

  const aujourdhui = new Date().toISOString().slice(0, 10)
  for (const m of achetes) {
    if (!acces.some((a) => a.utilisateurId === utilisateur.id && a.moduleId === m.id)) {
      acces.push({
        moduleId: m.id,
        utilisateurId: utilisateur.id,
        progression: 0,
        acheteLe: aujourdhui,
        termineLe: null,
      })
    }
  }

  const commande = {
    reference: `CMD-${Date.now().toString(36).toUpperCase()}`,
    utilisateurId: utilisateur.id,
    moduleIds: achetes.map((m) => m.id),
    total: achetes.reduce((s, m) => s + m.prixFcfa, 0),
    moyen: moyen ?? ('mobile-money' as const),
    statut: 'confirmee' as const,
    creeeLe: new Date().toISOString(),
  }
  commandes.push(commande)

  return {
    ...commande,
    modules: achetes.map((m) => ({ id: m.id, titre: m.titre, slug: m.slug })),
  }
})
