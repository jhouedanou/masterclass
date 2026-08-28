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

  const [transactions, utilisateurs, modules, acces, reglages] = await Promise.all([
    listerTransactions(),
    listerUtilisateurs(),
    listerModules(),
    listerAcces(),
    lireReglagesFinanciers(),
  ])

  const debut = DEBUT_PERIODE()
  const periode = surPeriode(transactions, debut)
  const precedente = surPeriode(transactions, DEBUT_PERIODE_PRECEDENTE(), debut)
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
