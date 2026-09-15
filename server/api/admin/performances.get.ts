import { lireReglagesFinanciers } from '../../database/administration'
import { listerModules } from '../../database/catalogue'
import { listerTransactions } from '../../database/commerce'
import { listerAcces, listerUtilisateurs } from '../../database/comptes'
import {
  chiffreAffaires,
  chiffreAffairesQuotidien,
  DEBUT_PERIODE,
  DEBUT_PERIODE_PRECEDENTE,
  evolution,
  surPeriode,
  transactionsReussies,
} from '../../utils/indicateurs'
import { exigerAdmin } from '../../utils/session'

/**
 * Indicateurs de l'écran Performances.
 *
 * Tout ce que la base sait est calculé ici : ventes, chiffre d'affaires,
 * acheteurs, répartition par programme, pays. Les mesures d'audience — visites,
 * taux de conversion, appareils, sources, page la plus vue — n'ont aucune
 * source : leur collecte passe par Google Tag Manager (Meta Pixel + API
 * Conversions, GA4, TikTok, LinkedIn), qui n'est pas branché. Elles valent
 * `null`, et l'écran affiche « — » plutôt qu'un chiffre inventé.
 */
export default defineEventHandler(async (event) => {
  await exigerAdmin(event)

  // Filtres de l'écran 18. Le pays vient du compte de l'acheteur, le programme
  // et le module de la transaction ; l'appareil et la source demanderont la
  // collecte, ils ne sont pas proposés tant qu'elle n'existe pas.
  const requete = getQuery(event)
  const lire = (cle: string) => (typeof requete[cle] === 'string' ? (requete[cle] as string) : '')
  const filtreProgramme = lire('programme')
  const filtreModule = lire('module')
  const filtrePays = lire('pays')
  const mois = lire('mois')

  const [toutesTransactions, utilisateurs, modules, acces, reglages] = await Promise.all([
    listerTransactions(),
    listerUtilisateurs(),
    listerModules(),
    listerAcces(),
    lireReglagesFinanciers(),
  ])

  const modulesRetenus = new Set(
    modules
      .filter((m) => !filtreProgramme || m.programme === filtreProgramme)
      .filter((m) => !filtreModule || m.id === filtreModule)
      .map((m) => m.id),
  )
  const paysDe = (utilisateurId: string) => utilisateurs.find((u) => u.id === utilisateurId)?.pays ?? ''

  const transactions = toutesTransactions
    .filter((t) => modulesRetenus.has(t.moduleId))
    .filter((t) => !filtrePays || paysDe(t.utilisateurId) === filtrePays)

  const debut = DEBUT_PERIODE()
  // Un mois choisi remplace la fenêtre glissante ; la comparaison à la période
  // précédente n'a alors plus de sens et se tait.
  const periode = mois
    ? transactions.filter((t) => t.date.slice(0, 7) === mois)
    : surPeriode(transactions, debut)
  const precedente = mois ? [] : surPeriode(transactions, DEBUT_PERIODE_PRECEDENTE(), debut)
  const reussies = transactionsReussies(transactions)

  const acheteursPeriode = new Set(periode.map((t) => t.utilisateurId))
  const acheteurs = new Set(reussies.map((t) => t.utilisateurId))

  // Un acheteur est « nouveau » si son premier paiement réussi tombe dans la
  // fenêtre courante.
  const premierAchat = new Map<string, string>()
  for (const t of [...reussies].sort((a, b) => a.date.localeCompare(b.date))) {
    if (!premierAchat.has(t.utilisateurId)) premierAchat.set(t.utilisateurId, t.date)
  }
  const nouveaux = [...premierAchat.values()].filter((date) => date >= debut).length

  const modulesParUtilisateur = new Map<string, number>()
  for (const a of acces) {
    modulesParUtilisateur.set(a.utilisateurId, (modulesParUtilisateur.get(a.utilisateurId) ?? 0) + 1)
  }
  const recurrents = [...modulesParUtilisateur.values()].filter((n) => n >= 2).length

  const parProgramme = { socialMedia: 0, entrepreneurs: 0 }
  for (const t of reussies) {
    const programme = modules.find((m) => m.id === t.moduleId)?.programme
    if (programme === 'social-media') parProgramme.socialMedia += 1
    else if (programme === 'entrepreneurs') parProgramme.entrepreneurs += 1
  }
  const totalProgramme = parProgramme.socialMedia + parProgramme.entrepreneurs

  // Pays le plus représenté parmi les acheteurs, avec sa part.
  const parPays = new Map<string, number>()
  for (const id of acheteurs) {
    const pays = utilisateurs.find((u) => u.id === id)?.pays
    if (pays) parPays.set(pays, (parPays.get(pays) ?? 0) + 1)
  }
  const meilleurPays = [...parPays.entries()].sort((a, b) => b[1] - a[1])[0]

  const caPeriode = chiffreAffaires(periode)
  const caTotal = chiffreAffaires(reussies)

  return {
    ca: caPeriode,
    evolutionCa: evolution(caPeriode, chiffreAffaires(precedente)),
    ventes: periode.length,
    modulesParAcheteur: acheteursPeriode.size
      ? Math.round((periode.length / acheteursPeriode.size) * 10) / 10
      : 0,
    repartitionProgramme: {
      socialMedia: totalProgramme ? Math.round((parProgramme.socialMedia / totalProgramme) * 100) : 0,
      entrepreneurs: totalProgramme
        ? Math.round((parProgramme.entrepreneurs / totalProgramme) * 100)
        : 0,
    },
    topPays: meilleurPays
      ? `${meilleurPays[0]} (${Math.round((meilleurPays[1] / acheteurs.size) * 100)} %)`
      : null,
    ltv: acheteurs.size ? Math.round(caTotal / acheteurs.size) : 0,
    acheteurs: acheteurs.size,
    nouveaux,
    recurrents,
    objectifCa: reglages.objectifCaMensuel,
    caQuotidien: chiffreAffairesQuotidien(transactions),

    // --- Ce que propose chaque filtre, tiré des données réelles ------------
    moisDisponibles: [...new Set(toutesTransactions.map((t) => t.date.slice(0, 7)))].sort().reverse(),
    paysDisponibles: [...new Set(utilisateurs.map((u) => u.pays).filter(Boolean))].sort(),
    modulesDisponibles: modules
      .filter((m) => !filtreProgramme || m.programme === filtreProgramme)
      .map((m) => ({ id: m.id, titre: m.titre, programme: m.programme })),

    // --- Onglet Ventes (18c) ------------------------------------------------
    ventesParModule: [...modulesRetenus]
      .map((id) => {
        const lignes = periode.filter((t) => t.moduleId === id && t.statut === 'reussie')
        return {
          titre: modules.find((m) => m.id === id)?.titre ?? '—',
          ventes: lignes.length,
          ca: chiffreAffaires(lignes),
        }
      })
      .filter((l) => l.ventes > 0)
      .sort((a, b) => b.ca - a.ca),
    ventesParPays: (() => {
      const parPaysVentes = new Map<string, { ventes: number; ca: number }>()
      for (const t of periode.filter((x) => x.statut === 'reussie')) {
        const pays = paysDe(t.utilisateurId) || 'Non renseigné'
        const ligne = parPaysVentes.get(pays) ?? { ventes: 0, ca: 0 }
        parPaysVentes.set(pays, { ventes: ligne.ventes + 1, ca: ligne.ca + t.montant })
      }
      return [...parPaysVentes.entries()]
        .map(([pays, v]) => ({ pays, ...v }))
        .sort((a, b) => b.ca - a.ca)
    })(),
    moyensPaiement: (() => {
      const parMoyen = new Map<string, number>()
      for (const t of periode.filter((x) => x.statut === 'reussie')) {
        parMoyen.set(t.moyen, (parMoyen.get(t.moyen) ?? 0) + 1)
      }
      const total = [...parMoyen.values()].reduce((s, n) => s + n, 0)
      return [...parMoyen.entries()]
        .map(([moyen, n]) => ({ moyen, ventes: n, part: total ? Math.round((n / total) * 100) : 0 }))
        .sort((a, b) => b.ventes - a.ventes)
    })(),

    // --- Onglet Clients (18e) ----------------------------------------------
    meilleursClients: (() => {
      const parClient = new Map<string, { ca: number; modules: number }>()
      for (const t of periode.filter((x) => x.statut === 'reussie')) {
        const ligne = parClient.get(t.utilisateurId) ?? { ca: 0, modules: 0 }
        parClient.set(t.utilisateurId, { ca: ligne.ca + t.montant, modules: ligne.modules + 1 })
      }
      return [...parClient.entries()]
        .map(([id, v]) => {
          const u = utilisateurs.find((x) => x.id === id)
          return { nom: u ? `${u.prenom} ${u.nom}` : '—', pays: u?.pays ?? '', ...v }
        })
        .sort((a, b) => b.ca - a.ca)
        .slice(0, 10)
    })(),
    // Part des acheteurs revenus prendre un second module : la seule mesure de
    // rétention que la base sait produire sans collecte d'audience.
    retention: acheteurs.size ? Math.round((recurrents / acheteurs.size) * 100) : null,

    // --- Onglet Funnel (18b) ------------------------------------------------
    // Les deux premières étapes viennent de la collecte, qui n'existe pas :
    // elles restent nulles plutôt que d'être devinées à partir des commandes.
    funnel: {
      visites: null,
      fichesVues: null,
      commandes: periode.length,
      paiements: periode.filter((t) => t.statut === 'reussie').length,
      echecs: periode.filter((t) => t.statut === 'echouee').length,
    },

    // --- En attente du branchement de la collecte (spec §11–12) -------------
    visites: null,
    visiteursUniques: null,
    tauxConversion: null,
    appareils: null,
    topSource: null,
    directReferents: null,
    pageLaPlusVue: null,
  }
})
