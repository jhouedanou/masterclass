import { modules, transactions, utilisateurs } from '../../data/db'
import { exigerAdmin } from '../../utils/session'

/** Écran verrouillé : seul un administrateur supérieur dispose du droit « Transactions ». */
export default defineEventHandler((event) => {
  exigerAdmin(event, true)

  return transactions.map((t) => {
    const u = utilisateurs.find((x) => x.id === t.utilisateurId)
    return {
      ...t,
      apprenant: u ? `${u.prenom} ${u.nom}` : '—',
      module: modules.find((m) => m.id === t.moduleId)?.titre ?? '—',
    }
  })
})
