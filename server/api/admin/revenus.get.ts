import { lireReglagesFinanciers } from '../../database/administration'
import { listerFormateurs, listerModules } from '../../database/catalogue'
import { listerDemandesCoachingPrive } from '../../database/coaching'
import { listerTransactions } from '../../database/commerce'
import { transactionsReussies } from '../../utils/indicateurs'
import { exigerAdmin } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await exigerAdmin(event)

  // Filtres de l'écran 21 : un mois, un programme, un formateur.
  const requete = getQuery(event)
  const lire = (cle: string) => (typeof requete[cle] === 'string' ? (requete[cle] as string) : '')
  const mois = lire('mois')
  const filtreProgramme = lire('programme')
  const filtreFormateur = lire('formateur')

  const [reglages, formateurs, modules, toutesTransactions, demandes] = await Promise.all([
    lireReglagesFinanciers(),
    listerFormateurs(),
    listerModules(),
    listerTransactions(),
    listerDemandesCoachingPrive(),
  ])

  const { fraisPaiementPourcent, partBigFivePourcent, partFormateurPourcent } = reglages

  const transactions = mois
    ? toutesTransactions.filter((t) => t.date.slice(0, 7) === mois)
    : toutesTransactions
  const reussies = transactionsReussies(transactions)

  const parFormateur = formateurs
    .filter((f) => !filtreFormateur || f.id === filtreFormateur)
    .map((f) => {
      const siens = new Set(
        modules
          .filter((m) => m.formateurId === f.id)
          .filter((m) => !filtreProgramme || m.programme === filtreProgramme)
          .map((m) => m.id),
      )

      const caModules = reussies
        .filter((t) => siens.has(t.moduleId))
        .reduce((somme, t) => somme + t.montant, 0)

      // Le coaching privé est porté par le formateur ; le collectif est inclus
      // dans le prix du module.
      const seances = demandes.filter(
        (d) =>
          siens.has(d.moduleId) &&
          (d.statut === 'payee' || d.statut === 'realisee') &&
          (!mois || (d.creneauRetenuLe ?? d.recueLe).slice(0, 7) === mois),
      )
      const caPrive = seances.reduce((somme, d) => somme + d.heures * f.coachingPriveFcfaHeure, 0)

      const ca = caModules + caPrive
      const marge = Math.round(ca * (1 - fraisPaiementPourcent / 100))
      return {
        id: f.id,
        nom: f.nom,
        ca,
        caModules,
        caPrive,
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

    // Par source : le coaching collectif est inclus dans le prix du module, il
    // n'a donc pas de ligne propre — l'inventer laisserait croire à un revenu
    // séparé.
    parSource: [
      {
        source: 'Modules',
        ca: parFormateur.reduce((somme, f) => somme + f.caModules, 0),
        detail: 'coaching collectif inclus dans le prix',
      },
      {
        source: 'Coaching privé',
        ca: parFormateur.reduce((somme, f) => somme + f.caPrive, 0),
        detail: 'séances payées ou réalisées',
      },
    ],
    moisDisponibles: [...new Set(toutesTransactions.map((t) => t.date.slice(0, 7)))].sort().reverse(),
    formateursDisponibles: formateurs.map((f) => ({ id: f.id, nom: f.nom })),
  }
})
