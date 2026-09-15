import type { CodeEchecPaiement } from '#shared/types'
import { listerModules } from '../../database/catalogue'
import { listerTransactions } from '../../database/commerce'
import { listerUtilisateurs } from '../../database/comptes'
import { exigerAdmin } from '../../utils/session'

/** Écran verrouillé : seul un administrateur supérieur dispose du droit
 *  « Transactions ». Filtrable par statut et motif d'échec (écran 18f). */
export default defineEventHandler(async (event) => {
  await exigerAdmin(event, true)
  const { statut, codeEchec, mois } = getQuery(event) as {
    statut?: string
    codeEchec?: CodeEchecPaiement
    mois?: string
  }

  const [transactions, utilisateurs, modules] = await Promise.all([
    listerTransactions(),
    listerUtilisateurs(),
    listerModules(),
  ])

  const depuis30j = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const echecs30j = transactions.filter((t) => t.statut === 'echouee' && t.date >= depuis30j)
  const parMotif: Partial<Record<CodeEchecPaiement, number>> = {}
  for (const t of echecs30j) {
    const code = t.codeEchec ?? 'erreur-inconnue'
    parMotif[code] = (parMotif[code] ?? 0) + 1
  }

  return {
    // Les mois où il s'est passé quelque chose, du plus récent au plus ancien :
    // proposer une année entière de mois vides n'aide personne.
    moisDisponibles: [...new Set(transactions.map((t) => t.date.slice(0, 7)))].sort().reverse(),
    transactions: transactions
      .filter((t) => !statut || t.statut === statut)
      .filter((t) => !codeEchec || t.codeEchec === codeEchec)
      .filter((t) => !mois || t.date.slice(0, 7) === mois)
      .map((t) => {
        const u = utilisateurs.find((x) => x.id === t.utilisateurId)
        return {
          ...t,
          apprenant: u ? `${u.prenom} ${u.nom}` : '—',
          module: modules.find((m) => m.id === t.moduleId)?.titre ?? '—',
        }
      }),
    echecs30j: { total: echecs30j.length, parMotif },
  }
})
