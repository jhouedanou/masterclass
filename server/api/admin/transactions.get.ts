import { listerModules } from '../../database/catalogue'
import { listerTransactions } from '../../database/commerce'
import { listerUtilisateurs } from '../../database/comptes'
import { exigerAdmin } from '../../utils/session'

/** Écran verrouillé : seul un administrateur supérieur dispose du droit « Transactions ». */
export default defineEventHandler(async (event) => {
  await exigerAdmin(event, true)

  const [transactions, utilisateurs, modules] = await Promise.all([
    listerTransactions(),
    listerUtilisateurs(),
    listerModules(),
  ])

  return transactions.map((t) => {
    const u = utilisateurs.find((x) => x.id === t.utilisateurId)
    return {
      ...t,
      apprenant: u ? `${u.prenom} ${u.nom}` : '—',
      module: modules.find((m) => m.id === t.moduleId)?.titre ?? '—',
    }
  })
})
