import { lireReglagesFinanciers } from '../../database/administration'
import { listerFormateurs, listerModules } from '../../database/catalogue'
import { listerDemandesCoachingPrive } from '../../database/coaching'
import { listerTransactions } from '../../database/commerce'
import { transactionsReussies } from '../../utils/indicateurs'
import { exigerAdmin } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await exigerAdmin(event)

  const [reglages, formateurs, modules, transactions, demandes] = await Promise.all([
    lireReglagesFinanciers(),
    listerFormateurs(),
    listerModules(),
    listerTransactions(),
    listerDemandesCoachingPrive(),
  ])

  const { fraisPaiementPourcent, partBigFivePourcent, partFormateurPourcent } = reglages
  const reussies = transactionsReussies(transactions)

  const parFormateur = formateurs.map((f) => {
    const siens = new Set(modules.filter((m) => m.formateurId === f.id).map((m) => m.id))

    const caModules = reussies
      .filter((t) => siens.has(t.moduleId))
      .reduce((somme, t) => somme + t.montant, 0)

    // Le coaching privé est porté par le formateur ; le collectif est inclus
    // dans le prix du module.
    const caPrive = demandes
      .filter((d) => siens.has(d.moduleId) && (d.statut === 'payee' || d.statut === 'realisee'))
      .reduce((somme, d) => somme + d.heures * f.coachingPriveFcfaHeure, 0)

    const ca = caModules + caPrive
    const marge = Math.round(ca * (1 - fraisPaiementPourcent / 100))
    return {
      id: f.id,
      nom: f.nom,
      ca,
      marge,
      remuneration: Math.round((marge * partFormateurPourcent) / 100),
    }
  })

  const caTotal = parFormateur.reduce((somme, f) => somme + f.ca, 0)
  const frais = Math.round((caTotal * fraisPaiementPourcent) / 100)
  const marge = caTotal - frais

  return {
    reglages,
    total: {
      ca: caTotal,
      frais,
      marge,
      revenuBigFive: Math.round((marge * partBigFivePourcent) / 100),
      revenuFormateurs: Math.round((marge * partFormateurPourcent) / 100),
    },
    parFormateur: parFormateur.sort((a, b) => b.ca - a.ca),
  }
})
