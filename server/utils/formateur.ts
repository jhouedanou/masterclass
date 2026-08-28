import type { SessionCoaching, Thematique } from '#shared/types'
import { listerFormateurs, listerModules, listerThematiques, trouverFormateur } from '../database/catalogue'
import { listerAcces } from '../database/comptes'
import { listerDemandesCoachingPrive, listerSessions } from '../database/coaching'
import { listerCertificats, listerTransactions } from '../database/commerce'
import { lireReglagesFinanciers } from '../database/administration'

/**
 * Statistiques des formateurs, calculées sur les données réelles.
 *
 * Il n'y a plus aucun compteur simulé ici : les inscriptions viennent de la
 * table `acces`, le chiffre d'affaires des transactions réussies, la complétion
 * de la progression enregistrée. Les indicateurs sans source en base — la
 * présence en séance tant que `sessions_coaching.presents` n'est pas relevé,
 * la note par session, qui n'est rattachée à aucune séance — valent `null`
 * plutôt qu'une valeur inventée.
 */

/** Fenêtre du compteur « nouveaux », telle qu'affichée dans l'en-tête du
 *  tableau des modules (« Nouveaux (30 j) »). */
const FENETRE_NOUVEAUX_JOURS = 30

function ilYaJours(jours: number): string {
  return new Date(Date.now() - jours * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export interface StatistiqueModule {
  id: string
  slug: string
  titre: string
  programme: string
  statut: string
  thematique: string
  inscrits: number
  nouveaux: number
  completion: number
  certificats: number
}

export async function statistiquesModules(formateurId: string): Promise<StatistiqueModule[]> {
  const [modules, thematiques, acces, certificats] = await Promise.all([
    listerModules(),
    listerThematiques(),
    listerAcces(),
    listerCertificats(),
  ])

  const depuis = ilYaJours(FENETRE_NOUVEAUX_JOURS)

  return modules
    .filter((m) => m.formateurId === formateurId)
    .map((m) => {
      const siens = acces.filter((a) => a.moduleId === m.id)
      const cumul = siens.reduce((somme, a) => somme + a.progression, 0)
      return {
        id: m.id,
        slug: m.slug,
        titre: m.titre,
        programme: m.programme,
        statut: m.statut,
        thematique: thematiques.find((t) => t.id === m.thematiqueId)?.nom ?? '',
        inscrits: siens.length,
        nouveaux: siens.filter((a) => a.acheteLe >= depuis).length,
        completion: siens.length ? Math.round(cumul / siens.length) : 0,
        certificats: certificats.filter((c) => c.moduleId === m.id).length,
      }
    })
}

/**
 * Rémunération du formateur.
 *
 * Le chiffre d'affaires provient des transactions réussies — un accès offert
 * par l'administration n'en génère pas. Le coaching privé est porté par le
 * formateur ; le collectif est compris dans le prix du module.
 */
export async function revenusFormateur(formateurId: string) {
  const [modules, transactions, demandes, reglages, formateur] = await Promise.all([
    listerModules(),
    listerTransactions(),
    listerDemandesCoachingPrive(),
    lireReglagesFinanciers(),
    trouverFormateur(formateurId),
  ])

  const tauxFrais = reglages.fraisPaiementPourcent / 100
  const partFormateur = reglages.partFormateurPourcent / 100
  const partPlateforme = reglages.partBigFivePourcent / 100

  const siens = modules.filter((m) => m.formateurId === formateurId)
  const reussies = transactions.filter((t) => t.statut === 'reussie')

  const lignes = siens
    .map((m) => {
      const ventes = reussies.filter((t) => t.moduleId === m.id)
      const ca = ventes.reduce((somme, t) => somme + t.montant, 0)
      const marge = Math.round(ca * (1 - tauxFrais))
      return {
        libelle: m.titre,
        ventes: ventes.length,
        ca,
        marge,
        part: Math.round(marge * partFormateur),
      }
    })
    .filter((ligne) => ligne.ventes > 0)

  // Séances payées ou déjà réalisées sur les modules du formateur.
  const idsModules = new Set(siens.map((m) => m.id))
  const seances = demandes.filter(
    (d) => idsModules.has(d.moduleId) && (d.statut === 'payee' || d.statut === 'realisee'),
  )
  const heures = seances.reduce((somme, d) => somme + d.heures, 0)

  if (heures > 0) {
    const tarif = formateur?.coachingPriveFcfaHeure ?? 50_000
    const caCoaching = heures * tarif
    const margeCoaching = Math.round(caCoaching * (1 - tauxFrais))
    lignes.push({
      libelle: `Coaching privé — ${heures} h à ${new Intl.NumberFormat('fr-FR').format(tarif)} F`,
      ventes: seances.length,
      ca: caCoaching,
      marge: margeCoaching,
      part: Math.round(margeCoaching * partFormateur),
    })
  }

  const ca = lignes.reduce((somme, l) => somme + l.ca, 0)
  const frais = Math.round(ca * tauxFrais)
  const marge = ca - frais

  return {
    lignes,
    total: {
      ca,
      frais,
      marge,
      remuneration: Math.round(marge * partFormateur),
      margePlateforme: Math.round(marge * partPlateforme),
    },
  }
}

export interface SessionFormateur extends SessionCoaching {
  thematique: Thematique | null
  /** Taux de présence, `null` tant que le relevé n'a pas été saisi. */
  participation: number | null
  /** Aucune note n'est rattachée à une séance : le champ reste vide et la vue
   *  affiche le nombre de sujets soumis à la place. */
  note: number | null
}

export async function sessionsFormateur(formateurId: string): Promise<SessionFormateur[]> {
  const [sessions, thematiques] = await Promise.all([listerSessions(), listerThematiques()])

  return sessions
    .filter((s) => s.formateurId === formateurId)
    .map((s) => ({
      ...s,
      thematique: thematiques.find((t) => t.id === s.thematiqueId) ?? null,
      participation:
        s.presents !== null && s.inscrits > 0 ? Math.round((s.presents / s.inscrits) * 100) : null,
      note: null,
    }))
}

export async function ficheFormateur(formateurId: string) {
  return await trouverFormateur(formateurId)
}

/** Moyenne des présences relevées, tous formats de séance confondus. */
export function presenceMoyenne(sessions: SessionFormateur[]): number | null {
  const releves = sessions
    .map((s) => s.participation)
    .filter((valeur): valeur is number => valeur !== null)
  if (!releves.length) return null
  return Math.round(releves.reduce((somme, v) => somme + v, 0) / releves.length)
}

/** Statistiques par formateur pour les écrans d'administration. */
export async function statistiquesFormateurs() {
  const [formateurs, modules, acces, sessions, demandes] = await Promise.all([
    listerFormateurs(),
    listerModules(),
    listerAcces(),
    listerSessions(),
    listerDemandesCoachingPrive(),
  ])

  return formateurs.map((f) => {
    const siens = modules.filter((m) => m.formateurId === f.id)
    const idsModules = new Set(siens.map((m) => m.id))
    const accesSiens = acces.filter((a) => idsModules.has(a.moduleId))
    const cumul = accesSiens.reduce((somme, a) => somme + a.progression, 0)

    const sesSessions = sessions.filter((s) => s.formateurId === f.id)
    const releves = sesSessions.filter((s) => s.presents !== null && s.inscrits > 0)

    return {
      id: f.id,
      nom: f.nom,
      nbModules: siens.filter((m) => m.statut === 'disponible').length,
      inscrits: accesSiens.length,
      completion: accesSiens.length ? Math.round(cumul / accesSiens.length) : 0,
      presence: releves.length
        ? Math.round(
            releves.reduce((somme, s) => somme + (s.presents! / s.inscrits) * 100, 0) /
              releves.length,
          )
        : null,
      coachingPrive: demandes.filter((d) => idsModules.has(d.moduleId)).length,
    }
  })
}
