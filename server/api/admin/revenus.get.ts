import { lireReglagesFinanciers } from '../../database/administration'
import { listerFormateurs, listerModules, listerThematiques } from '../../database/catalogue'
import { listerDemandesCoachingPrive, listerSessions } from '../../database/coaching'
import { listerTransactions } from '../../database/commerce'
import { listerUtilisateurs } from '../../database/comptes'
import { transactionsReussies } from '../../utils/indicateurs'
import { exigerSection } from '../../utils/session'

/**
 * Écran 21 — Revenus. Filtres combinables : mois, programme, module, coaching
 * session, coaching privé, formateur, pays. Tous les indicateurs se
 * recalculent selon la sélection.
 */
export default defineEventHandler(async (event) => {
  await exigerSection(event, 'statistiques-performance')

  const requete = getQuery(event)
  const lire = (cle: string) => (typeof requete[cle] === 'string' ? (requete[cle] as string) : '')
  const mois = lire('mois')
  const filtreProgramme = lire('programme')
  const filtreModule = lire('module')
  const filtreSession = lire('session')
  // « inclus » (défaut), « uniquement » ou « exclu ».
  const filtrePrive = lire('coachingPrive')
  const filtreFormateur = lire('formateur')
  const filtrePays = lire('pays')

  const [reglages, formateurs, modules, toutesTransactions, demandes, sessions, thematiques, utilisateurs] =
    await Promise.all([
      lireReglagesFinanciers(),
      listerFormateurs(),
      listerModules(),
      listerTransactions(),
      listerDemandesCoachingPrive(),
      listerSessions(),
      listerThematiques(),
      listerUtilisateurs(),
    ])

  const { fraisPaiementPourcent, partBigFivePourcent, partFormateurPourcent } = reglages

  // Une session de coaching collectif n'a pas de revenu propre : elle est
  // incluse dans le prix des modules de son programme animés par son
  // formateur. La choisir restreint donc l'écran à ces modules-là.
  const session = sessions.find((s) => s.id === filtreSession)

  const paysDe = (utilisateurId: string) => utilisateurs.find((u) => u.id === utilisateurId)?.pays ?? ''

  const transactions = toutesTransactions
    .filter((t) => !mois || t.date.slice(0, 7) === mois)
    .filter((t) => !filtrePays || paysDe(t.utilisateurId) === filtrePays)
  const reussies = transactionsReussies(transactions)

  const parFormateur = formateurs
    .filter((f) => !filtreFormateur || f.id === filtreFormateur)
    .filter((f) => !session || f.id === session.formateurId)
    .map((f) => {
      const siens = new Set(
        modules
          .filter((m) => m.formateurId === f.id)
          .filter((m) => !filtreProgramme || m.programme === filtreProgramme)
          .filter((m) => !filtreModule || m.id === filtreModule)
          .filter((m) => !session || m.programme === session.programme)
          .map((m) => m.id),
      )

      const ventes = reussies.filter((t) => siens.has(t.moduleId))
      const caModules = filtrePrive === 'uniquement' ? 0 : ventes.reduce((somme, t) => somme + t.montant, 0)

      // Le coaching privé est porté par le formateur ; le collectif est inclus
      // dans le prix du module.
      const seances =
        filtrePrive === 'exclu'
          ? []
          : demandes.filter(
              (d) =>
                siens.has(d.moduleId) &&
                (d.statut === 'payee' || d.statut === 'realisee') &&
                (!mois || (d.creneauRetenuLe ?? d.recueLe).slice(0, 7) === mois) &&
                (!filtrePays || paysDe(d.utilisateurId) === filtrePays),
            )
      const heuresPrive = seances.reduce((somme, d) => somme + d.heures, 0)
      const caPrive = seances.reduce((somme, d) => somme + d.heures * f.coachingPriveFcfaHeure, 0)

      const ca = caModules + caPrive
      const marge = Math.round(ca * (1 - fraisPaiementPourcent / 100))
      return {
        id: f.id,
        nom: f.nom,
        ca,
        caModules,
        caPrive,
        ventesModules: filtrePrive === 'uniquement' ? 0 : ventes.length,
        heuresPrive,
        marge,
        remuneration: Math.round((marge * partFormateurPourcent) / 100),
      }
    })

  const somme = (cle: 'ca' | 'caModules' | 'caPrive' | 'ventesModules' | 'heuresPrive') =>
    parFormateur.reduce((s, f) => s + f[cle], 0)
  const caTotal = somme('ca')
  const frais = Math.round((caTotal * fraisPaiementPourcent) / 100)
  const marge = caTotal - frais

  const ligneSource = (source: string, ca: number) => {
    const fraisSource = Math.round((ca * fraisPaiementPourcent) / 100)
    return { source, ca, frais: fraisSource, marge: ca - fraisSource }
  }

  const nomThematique = (id: string) => thematiques.find((t) => t.id === id)?.nom ?? 'Session'

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

    // Répartition par source de revenu : le coaching collectif est inclus
    // dans le prix du module, il n'a donc pas de ligne propre.
    parSource: [
      ligneSource(`Modules (${somme('ventesModules')} vente${somme('ventesModules') > 1 ? 's' : ''})`, somme('caModules')),
      ligneSource(`Coaching privé (${somme('heuresPrive')} h)`, somme('caPrive')),
    ],

    // --- Ce que propose chaque filtre --------------------------------------
    moisDisponibles: [...new Set(toutesTransactions.map((t) => t.date.slice(0, 7)))].sort().reverse(),
    formateursDisponibles: formateurs.map((f) => ({ id: f.id, nom: f.nom })),
    modulesDisponibles: modules
      .filter((m) => !filtreProgramme || m.programme === filtreProgramme)
      .map((m) => ({ id: m.id, titre: m.titre })),
    sessionsDisponibles: sessions
      .filter((s) => s.statut !== 'annulee')
      .filter((s) => !filtreProgramme || s.programme === filtreProgramme)
      .map((s) => ({ id: s.id, libelle: `${nomThematique(s.thematiqueId)} · ${s.date}` })),
    paysDisponibles: [...new Set(utilisateurs.map((u) => u.pays).filter(Boolean))].sort(),
  }
})
