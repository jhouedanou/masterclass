import type { SectionAdmin } from '#shared/types'
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
import { exigerAdmin, sectionsEffectives } from '../../utils/session'

/**
 * Vue d'ensemble (planche C, écran 01) : la page d'accueil de tout compte
 * d'administration, quelles que soient ses sections.
 *
 * Elle reprenait pourtant le chiffre d'affaires, les dernières transactions
 * nominatives et le journal, que les sections refusent par ailleurs à un
 * administrateur de contenu. Chaque bloc suit désormais la section de l'écran
 * qu'il résume ; un bloc non autorisé vaut `null` et la page le masque.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerAdmin(event)
  const siennes = sectionsEffectives(utilisateur)
  const voit = (...sections: SectionAdmin[]) =>
    siennes === 'toutes' || sections.some((s) => siennes.includes(s))
  const voitChiffres = voit('performances-marketing', 'statistiques-performance')
  const voitTransactions = voit('transactions-paiements')
  const voitJournal = voit('historique-versions')

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
    voitJournal ? listerJournal(3) : Promise.resolve(null),
  ])

  const modulesDuProgramme = new Set(
    modules.filter((m) => !programme || m.programme === programme).map((m) => m.id),
  )
  // Ventes de modules : une séance de coaching privé n'a pas de module.
  const retenues = transactions.filter((t) => t.moduleId !== null && modulesDuProgramme.has(t.moduleId))

  // Les objectifs du back-office sont mensuels : sans filtre de mois, les
  // compteurs comparés portent sur les trente derniers jours.
  const periode = mois
    ? retenues.filter((t) => t.date.slice(0, 7) === mois)
    : surPeriode(retenues, DEBUT_PERIODE())
  const ca = chiffreAffaires(periode)
  const frais = Math.round((ca * reglages.fraisPaiementPourcent) / 100)

  const ventesParModule = new Map<string, number>()
  for (const t of periode.filter((x) => x.statut === 'reussie')) {
    if (!t.moduleId) continue
    ventesParModule.set(t.moduleId, (ventesParModule.get(t.moduleId) ?? 0) + 1)
  }

  const cumulProgression = acces.reduce((somme, a) => somme + a.progression, 0)

  return {
    role: utilisateur.role,
    inscriptions: voitChiffres ? periode.length : null,
    objectifInscriptions: voitChiffres ? reglages.objectifInscriptionsMensuel : null,
    ca: voitChiffres ? ca : null,
    objectifCa: voitChiffres ? reglages.objectifCaMensuel : null,
    margeBrute: voitChiffres ? ca - frais : null,
    completionMoyenne: acces.length ? Math.round(cumulProgression / acces.length) : 0,
    certificatsGeneres: certificats.length,
    topModules: !voitChiffres ? null : [...ventesParModule.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([moduleId, ventes]) => {
        const module = modules.find((m) => m.id === moduleId)
        return {
          titre: module?.titre ?? '—',
          // La barre du top 5 porte la couleur du programme : violet pour
          // Social Média, bleu pour Entrepreneurs (planche C, écran 01).
          programme: module?.programme ?? '',
          ventes,
        }
      }),
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
    moisDisponibles: voitChiffres
      ? [...new Set(transactions.map((t) => t.date.slice(0, 7)))].sort().reverse()
      : [],
    dernieresTransactions: !voitTransactions ? null : retenues.slice(0, 5).map((t) => {
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
