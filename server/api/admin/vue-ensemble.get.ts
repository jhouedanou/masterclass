import {
  acces,
  candidaturesFormateurs,
  certificats,
  demandesCoachingPrive,
  formateurs,
  journal,
  modules,
  reglagesFinanciers,
  sessionsCoaching,
  thematiques,
  transactions,
  utilisateurs,
} from '../../data/db'
import { statistiquesModules } from '../../utils/formateur'
import { exigerAdmin } from '../../utils/session'

export default defineEventHandler((event) => {
  const utilisateur = exigerAdmin(event)

  const ventes = formateurs.flatMap((f) => statistiquesModules(f.id))
  const inscriptions = ventes.reduce((s, m) => s + m.inscrits, 0)
  const ca = inscriptions * 10_000
  const frais = Math.round((ca * reglagesFinanciers.fraisPaiementPourcent) / 100)

  return {
    role: utilisateur.role,
    inscriptions,
    objectifInscriptions: reglagesFinanciers.objectifInscriptionsMensuel,
    ca,
    objectifCa: reglagesFinanciers.objectifCaMensuel,
    margeBrute: ca - frais,
    completionMoyenne: ventes.length
      ? Math.round(ventes.reduce((s, m) => s + m.completion, 0) / ventes.length)
      : 0,
    certificatsGeneres: certificats.length + 86,
    topModules: [...ventes]
      .filter((m) => m.statut === 'disponible')
      .sort((a, b) => b.inscrits - a.inscrits)
      .slice(0, 5)
      .map((m) => ({ titre: m.titre, ventes: m.inscrits })),
    aTraiter: {
      coachingPrive: demandesCoachingPrive.filter((d) => d.statut === 'en-attente').length,
      candidatures: candidaturesFormateurs.filter((c) => c.statut === 'nouvelle').length,
      sessionsAReprogrammer: sessionsCoaching.filter((s) => s.statut === 'annulee').length,
    },
    prochainesSessions: sessionsCoaching
      .filter((s) => s.statut === 'planifiee')
      .map((s) => ({
        date: s.date,
        thematique: thematiques.find((t) => t.id === s.thematiqueId)?.nom ?? '',
        formateur: formateurs.find((f) => f.id === s.formateurId)?.nom ?? '',
        inscrits: s.inscrits,
        places: s.places,
      })),
    dernieresTransactions: transactions.slice(0, 3).map((t) => ({
      reference: t.reference,
      apprenant: (() => {
        const u = utilisateurs.find((x) => x.id === t.utilisateurId)
        return u ? `${u.prenom} ${u.nom}` : '—'
      })(),
      module: modules.find((m) => m.id === t.moduleId)?.titre ?? '—',
      montant: t.montant,
      statut: t.statut,
    })),
    journal: journal.slice(0, 3),
    comptesActifs: utilisateurs.filter((u) => u.role === 'apprenant').length,
    accesTotal: acces.length,
  }
})
