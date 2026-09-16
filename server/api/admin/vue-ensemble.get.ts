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

  // Filtres de l'écran 01 : un mois « AAAA-MM » et un programme. Absents, la
  // vue porte sur les trente derniers jours, comme les objectifs mensuels.
  const requete = getQuery(event)
  const mois = typeof requete.mois === 'string' && /^\d{4}-\d{2}$/.test(requete.mois) ? requete.mois : ''
  const programme = typeof requete.programme === 'string' ? requete.programme : ''

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

  const modulesDuProgramme = new Set(
    modules.filter((m) => !programme || m.programme === programme).map((m) => m.id),
  )
  const retenues = transactions.filter((t) => modulesDuProgramme.has(t.moduleId))

  // Les objectifs du back-office sont mensuels : sans filtre de mois, les
  // compteurs comparés portent sur les trente derniers jours.
  const periode = mois
    ? retenues.filter((t) => t.date.slice(0, 7) === mois)
    : surPeriode(retenues, DEBUT_PERIODE())
  const ca = chiffreAffaires(periode)
  const frais = Math.round((ca * reglages.fraisPaiementPourcent) / 100)

  const ventesParModule = new Map<string, number>()
  for (const t of periode.filter((x) => x.statut === 'reussie')) {
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
        // La barre du top 5 prend la couleur du programme (écran 01).
        programme: modules.find((m) => m.id === moduleId)?.programme ?? 'social-media',
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
    moisDisponibles: [...new Set(transactions.map((t) => t.date.slice(0, 7)))].sort().reverse(),
    dernieresTransactions: retenues.slice(0, 5).map((t) => {
      const u = utilisateurs.find((x) => x.id === t.utilisateurId)
      return {
        reference: t.reference,
        apprenant: u ? `${u.prenom} ${u.nom}` : '—',
        module: modules.find((m) => m.id === t.moduleId)?.titre ?? '—',
        montant: t.montant,
        statut: t.statut,
        // La référence du prestataire est celle que l'équipe cite au support
        // FeexPay ; la nôtre ne lui dit rien.
        referenceFeexpay: t.referencePrestataire ?? null,
      }
    }),
    journal,
    comptesActifs: utilisateurs.filter((u) => u.role === 'apprenant').length,
    accesTotal: acces.length,
  }
})
