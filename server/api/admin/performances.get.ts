import { lireReglagesFinanciers } from '../../database/administration'
import { listerModules } from '../../database/catalogue'
import { listerTransactions } from '../../database/commerce'
import { listerAcces, listerConnexionsReussies, listerUtilisateurs } from '../../database/comptes'
import {
  chiffreAffaires,
  chiffreAffairesQuotidien,
  DEBUT_PERIODE,
  DEBUT_PERIODE_PRECEDENTE,
  evolution,
  familleAppareil,
  navigateurDepuisUserAgent,
  part,
  surPeriode,
  transactionsReussies,
} from '../../utils/indicateurs'
import { exigerSection } from '../../utils/session'

/**
 * Indicateurs de l'écran Performances (planche C, écrans 18 à 18e).
 *
 * Tout ce que la base sait est calculé ici : ventes, chiffre d'affaires,
 * acheteurs, répartition par programme, pays, appareil (déduit du journal des
 * connexions). Les mesures d'audience — visites, pages vues, durée, sources,
 * clics — n'ont aucune source : leur collecte passe par Google Tag Manager
 * (Meta Pixel + API Conversions, GA4, TikTok, LinkedIn), qui n'est pas
 * branché. Elles valent `null`, et l'écran affiche « — » plutôt qu'un chiffre
 * inventé.
 */
export default defineEventHandler(async (event) => {
  await exigerSection(event, 'performances-marketing')

  // Filtres de l'écran 18. Le pays vient du compte de l'acheteur, le programme
  // et le module de la transaction, l'appareil du dernier appareil connu de
  // l'acheteur. La source demanderait la collecte : le filtre est accepté mais
  // ne retient rien tant qu'elle n'existe pas.
  const requete = getQuery(event)
  const lire = (cle: string) => (typeof requete[cle] === 'string' ? (requete[cle] as string) : '')
  const filtreProgramme = lire('programme')
  const filtreModule = lire('module')
  const filtrePays = lire('pays')
  const filtreAppareil = lire('appareil')
  const mois = lire('mois')

  const debut = DEBUT_PERIODE()
  const debutMois = mois ? `${mois}-01` : debut

  const [toutesTransactions, utilisateurs, modules, acces, reglages, connexions] = await Promise.all([
    listerTransactions(),
    listerUtilisateurs(),
    listerModules(),
    listerAcces(),
    lireReglagesFinanciers(),
    listerConnexionsReussies(`${debutMois < DEBUT_PERIODE_PRECEDENTE() ? debutMois : DEBUT_PERIODE_PRECEDENTE()}T00:00:00Z`),
  ])

  const moduleDe = (id: string) => modules.find((m) => m.id === id)
  const modulesRetenus = new Set(
    modules
      .filter((m) => !filtreProgramme || m.programme === filtreProgramme)
      .filter((m) => !filtreModule || m.id === filtreModule)
      .map((m) => m.id),
  )
  const utilisateurDe = (id: string) => utilisateurs.find((u) => u.id === id)
  const paysDe = (utilisateurId: string) => utilisateurDe(utilisateurId)?.pays ?? ''

  // Dernier appareil connu par apprenant (les connexions sont triées de la
  // plus récente à la plus ancienne).
  const appareilDe = new Map<string, 'Mobile' | 'Desktop'>()
  for (const c of connexions) {
    const famille = familleAppareil(c.appareil)
    if (famille && !appareilDe.has(c.utilisateurId)) appareilDe.set(c.utilisateurId, famille)
  }

  const transactions = toutesTransactions
    .filter((t) => modulesRetenus.has(t.moduleId))
    .filter((t) => !filtrePays || paysDe(t.utilisateurId) === filtrePays)
    .filter((t) => !filtreAppareil || appareilDe.get(t.utilisateurId) === filtreAppareil)

  // Un mois choisi remplace la fenêtre glissante ; la comparaison à la période
  // précédente n'a alors plus de sens et se tait.
  const periode = mois
    ? transactions.filter((t) => t.date.slice(0, 7) === mois)
    : surPeriode(transactions, debut)
  const precedente = mois ? [] : surPeriode(transactions, DEBUT_PERIODE_PRECEDENTE(), debut)
  const reussies = transactionsReussies(transactions)
  const reussiesPeriode = transactionsReussies(periode)
  const tentativesPeriode = mois
    ? transactions.filter((t) => t.date.slice(0, 7) === mois)
    : transactions.filter((t) => t.date >= debut)

  const acheteursPeriode = new Set(reussiesPeriode.map((t) => t.utilisateurId))
  const acheteurs = new Set(reussies.map((t) => t.utilisateurId))

  // Un acheteur est « nouveau » si son premier paiement réussi tombe dans la
  // fenêtre courante.
  const premierAchat = new Map<string, string>()
  for (const t of [...reussies].sort((a, b) => a.date.localeCompare(b.date))) {
    if (!premierAchat.has(t.utilisateurId)) premierAchat.set(t.utilisateurId, t.date)
  }
  const dansPeriode = (date: string) => (mois ? date.slice(0, 7) === mois : date >= debut)
  const nouveauxIds = [...premierAchat.entries()].filter(([, date]) => dansPeriode(date)).map(([id]) => id)

  const modulesParUtilisateur = new Map<string, Set<string>>()
  for (const a of acces) {
    if (!acheteurs.has(a.utilisateurId)) continue
    const s = modulesParUtilisateur.get(a.utilisateurId) ?? new Set<string>()
    s.add(a.moduleId)
    modulesParUtilisateur.set(a.utilisateurId, s)
  }
  const recurrentsIds = [...modulesParUtilisateur.entries()].filter(([, s]) => s.size >= 2).map(([id]) => id)

  const parProgramme = { socialMedia: 0, entrepreneurs: 0 }
  for (const t of reussiesPeriode) {
    const programme = moduleDe(t.moduleId)?.programme
    if (programme === 'social-media') parProgramme.socialMedia += 1
    else if (programme === 'entrepreneurs') parProgramme.entrepreneurs += 1
  }
  const totalProgramme = parProgramme.socialMedia + parProgramme.entrepreneurs

  // Pays le plus représenté parmi les acheteurs, avec sa part.
  const parPays = new Map<string, number>()
  for (const id of acheteurs) {
    const pays = paysDe(id)
    if (pays) parPays.set(pays, (parPays.get(pays) ?? 0) + 1)
  }
  const meilleurPays = [...parPays.entries()].sort((a, b) => b[1] - a[1])[0]

  const caPeriode = chiffreAffaires(reussiesPeriode)
  const caTotal = chiffreAffaires(reussies)

  // --- Regroupements réutilisés par plusieurs onglets ------------------------
  const ventesParModule = [...modulesRetenus]
    .map((id) => {
      const lignes = reussiesPeriode.filter((t) => t.moduleId === id)
      const m = moduleDe(id)
      return {
        id,
        titre: m?.titre ?? '—',
        programme: m?.programme === 'social-media' ? 'SM' : 'ENT',
        ventes: lignes.length,
        ca: chiffreAffaires(lignes),
      }
    })
    .filter((l) => l.ventes > 0)
    .sort((a, b) => b.ca - a.ca)

  const ventesParPays = (() => {
    const carte = new Map<string, { ventes: number; ca: number }>()
    for (const t of reussiesPeriode) {
      const pays = paysDe(t.utilisateurId) || 'Non renseigné'
      const ligne = carte.get(pays) ?? { ventes: 0, ca: 0 }
      carte.set(pays, { ventes: ligne.ventes + 1, ca: ligne.ca + t.montant })
    }
    return [...carte.entries()]
      .map(([pays, v]) => ({ pays, ...v, part: part(v.ventes, reussiesPeriode.length) ?? 0 }))
      .sort((a, b) => b.ca - a.ca)
  })()

  const parClient = new Map<string, { ca: number; achats: number }>()
  for (const t of reussiesPeriode) {
    const ligne = parClient.get(t.utilisateurId) ?? { ca: 0, achats: 0 }
    parClient.set(t.utilisateurId, { ca: ligne.ca + t.montant, achats: ligne.achats + 1 })
  }
  const clients = [...parClient.entries()]
    .map(([id, v]) => {
      const u = utilisateurDe(id)
      return {
        id,
        nom: u ? `${u.prenom} ${u.nom}` : '—',
        pays: u?.pays ?? '',
        nouveau: nouveauxIds.includes(id),
        recurrent: recurrentsIds.includes(id),
        ...v,
      }
    })
    .sort((a, b) => b.ca - a.ca)
  const meilleurAcheteur = clients[0] ?? null

  // Appareils : connexions réussies de la période, une par apprenant et par
  // famille. Sans collecte d'audience, c'est la seule répartition mesurable.
  const connexionsPeriode = connexions.filter((c) => dansPeriode(c.creeLe.slice(0, 10)))
  const parAppareil = { Mobile: 0, Desktop: 0 }
  const parNavigateur = new Map<string, number>()
  for (const c of connexionsPeriode) {
    const famille = familleAppareil(c.appareil)
    if (famille) parAppareil[famille] += 1
    const nav = navigateurDepuisUserAgent(c.appareil)
    if (nav) parNavigateur.set(nav, (parNavigateur.get(nav) ?? 0) + 1)
  }
  const totalAppareils = parAppareil.Mobile + parAppareil.Desktop
  const navigateurs = [...parNavigateur.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
  const ventesParAppareil = (famille: 'Mobile' | 'Desktop') =>
    reussiesPeriode.filter((t) => appareilDe.get(t.utilisateurId) === famille).length

  // Clients par programme : un acheteur est « bi-programmes » s'il possède au
  // moins un module de chaque.
  const clientsParProgramme = { socialMediaSeul: 0, entrepreneursSeul: 0, lesDeux: 0 }
  let caBiProgrammes = 0
  for (const id of acheteurs) {
    const programmes = new Set(
      [...(modulesParUtilisateur.get(id) ?? [])].map((m) => moduleDe(m)?.programme).filter(Boolean),
    )
    if (programmes.size >= 2) {
      clientsParProgramme.lesDeux += 1
      caBiProgrammes += chiffreAffaires(reussies.filter((t) => t.utilisateurId === id))
    } else if (programmes.has('social-media')) clientsParProgramme.socialMediaSeul += 1
    else if (programmes.has('entrepreneurs')) clientsParProgramme.entrepreneursSeul += 1
  }

  // Nouveaux acheteurs par semaine de la période (S1 = première semaine).
  const debutSemaines = new Date(`${debutMois}T00:00:00Z`).getTime()
  const nouveauxParSemaine = [0, 0, 0, 0, 0]
  for (const id of nouveauxIds) {
    const date = premierAchat.get(id)!
    const index = Math.min(4, Math.floor((new Date(`${date}T00:00:00Z`).getTime() - debutSemaines) / (7 * 86_400_000)))
    nouveauxParSemaine[Math.max(0, index)]! += 1
  }

  const comptesValides = tentativesPeriode.length
  const paiements = reussiesPeriode.length

  return {
    ca: caPeriode,
    evolutionCa: evolution(caPeriode, chiffreAffaires(precedente)),
    ventes: paiements,
    modulesParAcheteur: acheteursPeriode.size ? Math.round((paiements / acheteursPeriode.size) * 10) / 10 : 0,
    repartitionProgramme: {
      socialMedia: part(parProgramme.socialMedia, totalProgramme) ?? 0,
      entrepreneurs: part(parProgramme.entrepreneurs, totalProgramme) ?? 0,
      ventesSocialMedia: parProgramme.socialMedia,
      ventesEntrepreneurs: parProgramme.entrepreneurs,
    },
    topModule: ventesParModule[0] ? { titre: ventesParModule[0].titre, ventes: ventesParModule[0].ventes } : null,
    topPays: meilleurPays ? `${meilleurPays[0]} (${part(meilleurPays[1], acheteurs.size)} %)` : null,
    ltv: acheteurs.size ? Math.round(caTotal / acheteurs.size) : 0,
    meilleurAcheteur: meilleurAcheteur ? { nom: meilleurAcheteur.nom, ca: meilleurAcheteur.ca } : null,
    acheteurs: acheteurs.size,
    nouveaux: nouveauxIds.length,
    recurrents: recurrentsIds.length,
    objectifCa: reglages.objectifCaMensuel,
    caQuotidien: chiffreAffairesQuotidien(transactions),

    // --- Ce que propose chaque filtre, tiré des données réelles ------------
    moisDisponibles: [...new Set(toutesTransactions.map((t) => t.date.slice(0, 7)))].sort().reverse(),
    paysDisponibles: [...new Set(utilisateurs.map((u) => u.pays).filter(Boolean))].sort(),
    appareilsDisponibles: [...new Set(appareilDe.values())].sort(),
    // Aucune source n'est mesurée : le filtre n'a qu'un « — » à proposer.
    sourcesDisponibles: [] as string[],
    modulesDisponibles: modules
      .filter((m) => !filtreProgramme || m.programme === filtreProgramme)
      .map((m) => ({ id: m.id, titre: m.titre, programme: m.programme })),

    // --- Onglet Ventes (18c) ------------------------------------------------
    modulesDistincts: { vendus: ventesParModule.length, total: modules.length },
    ventesParModule,
    ventesParPays,
    moyensPaiement: (() => {
      const parMoyen = new Map<string, number>()
      for (const t of reussiesPeriode) parMoyen.set(t.moyen, (parMoyen.get(t.moyen) ?? 0) + 1)
      return [...parMoyen.entries()]
        .map(([moyen, n]) => ({ moyen, ventes: n, part: part(n, paiements) ?? 0 }))
        .sort((a, b) => b.ventes - a.ventes)
    })(),

    // --- Onglet Visites (18d) -----------------------------------------------
    appareils: totalAppareils
      ? {
          mobile: parAppareil.Mobile,
          desktop: parAppareil.Desktop,
          partMobile: part(parAppareil.Mobile, totalAppareils) ?? 0,
          partDesktop: part(parAppareil.Desktop, totalAppareils) ?? 0,
          navigateurs: navigateurs.map(([nom]) => nom).join(' · '),
          partNavigateurs: part(
            navigateurs.reduce((s, [, n]) => s + n, 0),
            connexionsPeriode.length,
          ),
        }
      : null,

    // --- Onglet Clients (18e) ----------------------------------------------
    clients,
    nouveauxParSemaine: nouveauxParSemaine.map((n, i) => ({ semaine: `S${i + 1}`, nouveaux: n })),
    clientsParPays: [...parPays.entries()]
      .map(([pays, n]) => ({ pays, clients: n }))
      .sort((a, b) => b.clients - a.clients),
    clientsParProgramme,
    ltvBiProgrammes: clientsParProgramme.lesDeux ? Math.round(caBiProgrammes / clientsParProgramme.lesDeux) : null,
    // Part des acheteurs revenus prendre un second module : la seule mesure de
    // rétention que la base sait produire sans collecte d'audience.
    retention: part(recurrentsIds.length, acheteurs.size),

    // --- Onglet Funnel (18b) ------------------------------------------------
    // Les deux premières étapes viennent de la collecte, qui n'existe pas :
    // elles restent nulles plutôt que d'être devinées à partir des commandes.
    funnel: {
      visites: null as number | null,
      clics: null as number | null,
      comptes: comptesValides,
      paiements,
      echecs: tentativesPeriode.filter((t) => t.statut === 'echouee').length,
    },
    conversionParAppareil: (['Mobile', 'Desktop'] as const).map((appareil) => ({
      appareil,
      visites: null as number | null,
      ventes: ventesParAppareil(appareil),
      taux: null as number | null,
    })),
    conversionParPays: ventesParPays.map((l) => ({
      pays: l.pays,
      visites: null as number | null,
      ventes: l.ventes,
      taux: null as number | null,
    })),
    conversionParSource: [] as { source: string; visites: number | null; ventes: number; taux: number | null }[],

    // --- En attente du branchement de la collecte (spec §11–12) -------------
    visites: null as number | null,
    visiteursUniques: null as number | null,
    pagesVues: null as number | null,
    dureeMoyenne: null as string | null,
    tauxConversion: null as number | null,
    topSource: null as string | null,
    directReferents: null as number | null,
    pageLaPlusVue: null as string | null,
    visitesQuotidiennes: null as number[] | null,
    visitesParPays: null as { pays: string; visites: number }[] | null,
    sources: null as { source: string; medium: string; visites: number }[] | null,
  }
})
