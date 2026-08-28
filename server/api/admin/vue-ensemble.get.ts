import {
  lireReglagesFinanciers,
  listerCandidatures,
  listerJournal,
} from '../../database/administration'
import { listerFormateurs, listerModules, listerThematiques } from '../../database/catalogue'
import { listerDemandesCoachingPrive, listerSessions } from '../../database/coaching'
import { listerCertificats, listerTransactions } from '../../database/commerce'
import { listerAcces, listerUtilisateurs } from '../../database/comptes'
import { chiffreAffaires, DEBUT_PERIODE, surPeriode } from '../../utils/indicateurs'
import { exigerAdmin } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const utilisateur = await exigerAdmin(event)

  const [
    reglages,
    modules,
    thematiques,
    formateurs,
    sessions,
    transactions,
    certificats,
    acces,
    utilisateurs,
    demandes,
    candidatures,
    journal,
  ] = await Promise.all([
    lireReglagesFinanciers(),
    listerModules(),
    listerThematiques(),
    listerFormateurs(),
    listerSessions(),
    listerTransactions(),
    listerCertificats(),
    listerAcces(),
    listerUtilisateurs(),
    listerDemandesCoachingPrive(),
    listerCandidatures(),
    listerJournal(3),
  ])

  // Les objectifs du back-office sont mensuels : les compteurs comparés portent
  // sur les trente derniers jours.
  const periode = surPeriode(transactions, DEBUT_PERIODE())
  const ca = chiffreAffaires(periode)
  const frais = Math.round((ca * reglages.fraisPaiementPourcent) / 100)

  const ventesParModule = new Map<string, number>()
  for (const t of transactions.filter((x) => x.statut === 'reussie')) {
    ventesParModule.set(t.moduleId, (ventesParModule.get(t.moduleId) ?? 0) + 1)
  }

  const cumulProgression = acces.reduce((somme, a) => somme + a.progression, 0)

  return {
    role: utilisateur.role,
    inscriptions: periode.length,
    objectifInscriptions: reglages.objectifInscriptionsMensuel,
    ca,
    objectifCa: reglages.objectifCaMensuel,
    margeBrute: ca - frais,
    completionMoyenne: acces.length ? Math.round(cumulProgression / acces.length) : 0,
    certificatsGeneres: certificats.length,
    topModules: [...ventesParModule.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([moduleId, ventes]) => ({
        titre: modules.find((m) => m.id === moduleId)?.titre ?? '—',
        ventes,
      })),
    aTraiter: {
      coachingPrive: demandes.filter((d) => d.statut === 'en-attente').length,
      candidatures: candidatures.filter((c) => c.statut === 'nouvelle').length,
      sessionsAReprogrammer: sessions.filter((s) => s.statut === 'annulee').length,
    },
    prochainesSessions: sessions
      .filter((s) => s.statut === 'planifiee')
      .map((s) => ({
        date: s.date,
        thematique: thematiques.find((t) => t.id === s.thematiqueId)?.nom ?? '',
        formateur: formateurs.find((f) => f.id === s.formateurId)?.nom ?? '',
        inscrits: s.inscrits,
        places: s.places,
      })),
    dernieresTransactions: transactions.slice(0, 3).map((t) => {
      const u = utilisateurs.find((x) => x.id === t.utilisateurId)
      return {
        reference: t.reference,
        apprenant: u ? `${u.prenom} ${u.nom}` : '—',
        module: modules.find((m) => m.id === t.moduleId)?.titre ?? '—',
        montant: t.montant,
        statut: t.statut,
      }
    }),
    journal,
    comptesActifs: utilisateurs.filter((u) => u.role === 'apprenant').length,
    accesTotal: acces.length,
  }
})
