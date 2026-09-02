import type { CodeEchecPaiement } from '#shared/types'
import { listerModules } from '../../database/catalogue'
import { listerTransactions } from '../../database/commerce'
import { listerUtilisateurs } from '../../database/comptes'
import { exigerAdmin } from '../../utils/session'

/** Écran verrouillé : seul un administrateur supérieur dispose du droit
 *  « Transactions ». Filtrable par statut et motif d'échec (écran 18f). */
export default defineEventHandler(async (event) => {
  await exigerAdmin(event, true)
  const { statut, codeEchec } = getQuery(event) as { statut?: string; codeEchec?: CodeEchecPaiement }

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
    transactions: transactions
      .filter((t) => !statut || t.statut === statut)
      .filter((t) => !codeEchec || t.codeEchec === codeEchec)
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
