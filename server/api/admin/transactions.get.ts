import type { CodeEchecPaiement, Transaction } from '#shared/types'
import { listerModules } from '../../database/catalogue'
import { listerTransactions } from '../../database/commerce'
import { listerUtilisateurs } from '../../database/comptes'
import { exigerAdmin } from '../../utils/session'

/** Les six motifs de la maquette (écran 18f), dans son ordre. Les codes
 *  internes qui n'y figurent pas (annulation, erreur inconnue) sont regroupés
 *  sous « Autre ». */
const MOTIFS_ECHEC: { code: CodeEchecPaiement | 'autre'; libelle: string }[] = [
  { code: 'solde-insuffisant', libelle: 'Solde insuffisant' },
  { code: 'delai-depasse', libelle: 'Validation MoMo expirée' },
  { code: 'reseau-operateur', libelle: 'Refus opérateur' },
  { code: 'interruption-reseau', libelle: 'Interruption réseau' },
  { code: 'carte-refusee', libelle: 'Carte Visa refusée' },
  { code: 'doublon', libelle: 'Double paiement détecté' },
  { code: 'autre', libelle: 'Autre' },
]

type SuiteEchec = 'paye-j1' | 'relance' | 'sans-suite'

/** Jour suivant au format « AAAA-MM-JJ » (les transactions sont datées au jour). */
const lendemain = (date: string) => new Date(new Date(`${date}T00:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10)

/**
 * Suite donnée à un échec : « Payé à J+1 ✓ » si l'apprenant a réglé le même
 * module dans les 24 h, « Relancé » s'il a retenté sans y parvenir, « Sans
 * suite » sinon.
 */
function suiteDe(echec: Transaction, toutes: Transaction[]): SuiteEchec {
  const memesTentatives = toutes.filter(
    (t) =>
      t.reference !== echec.reference &&
      t.utilisateurId === echec.utilisateurId &&
      t.moduleId === echec.moduleId &&
      t.date >= echec.date,
  )
  if (memesTentatives.some((t) => t.statut === 'reussie' && t.date <= lendemain(echec.date))) return 'paye-j1'
  if (memesTentatives.some((t) => t.statut !== 'reussie')) return 'relance'
  return 'sans-suite'
}

/** Écran verrouillé : seul un administrateur supérieur dispose du droit
 *  « Transactions ». Filtrable par statut, motif d'échec et mois (écran 18f). */
export default defineEventHandler(async (event) => {
  await exigerAdmin(event, true)
  const { statut, codeEchec, mois } = getQuery(event) as {
    statut?: string
    codeEchec?: CodeEchecPaiement | 'autre'
    mois?: string
  }

  const [transactions, utilisateurs, modules] = await Promise.all([
    listerTransactions(),
    listerUtilisateurs(),
    listerModules(),
  ])

  const codesMaquette = new Set(MOTIFS_ECHEC.map((m) => m.code))
  const motifDe = (t: Transaction) =>
    t.codeEchec && codesMaquette.has(t.codeEchec) ? t.codeEchec : 'autre'

  const surMois = transactions.filter((t) => !mois || t.date.slice(0, 7) === mois)

  // Répartition par motif sur le mois affiché.
  const echecs = surMois.filter((t) => t.statut === 'echouee')
  const parMotif = MOTIFS_ECHEC.map((m) => {
    const n = echecs.filter((t) => motifDe(t) === m.code).length
    return { ...m, total: n, part: echecs.length ? Math.round((n / echecs.length) * 100) : 0 }
  }).filter((m) => m.code !== 'autre' || m.total > 0)

  const suites = new Map(echecs.map((t) => [t.reference, suiteDe(t, transactions)] as const))
  const payesJ1 = [...suites.values()].filter((s) => s === 'paye-j1').length

  return {
    // Les mois où il s'est passé quelque chose, du plus récent au plus ancien :
    // proposer une année entière de mois vides n'aide personne.
    moisDisponibles: [...new Set(transactions.map((t) => t.date.slice(0, 7)))].sort().reverse(),
    transactions: surMois
      .filter((t) => !statut || t.statut === statut)
      .filter((t) => !codeEchec || motifDe(t) === codeEchec)
      .map((t) => {
        const u = utilisateurs.find((x) => x.id === t.utilisateurId)
        return {
          ...t,
          apprenant: u ? `${u.prenom} ${u.nom}` : '—',
          module: modules.find((m) => m.id === t.moduleId)?.titre ?? '—',
          motif: MOTIFS_ECHEC.find((m) => m.code === motifDe(t))?.libelle ?? '',
          suite: suites.get(t.reference) ?? null,
        }
      }),
    echecs: {
      total: echecs.length,
      parMotif,
      // Part des échecs suivis d'un paiement réussi dans les 24 h.
      partPayesJ1: echecs.length ? Math.round((payesJ1 / echecs.length) * 100) : null,
    },
  }
})
